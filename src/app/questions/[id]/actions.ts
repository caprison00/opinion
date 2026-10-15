"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildProbs,
  CONFIDENCE_LEVELS,
  isAccepting,
  OX_QUICK_P,
  type Question,
} from "@/lib/questions";

export type PredictionState = { error?: string; savedAt?: number };

// OX: choice = 고른 쪽(0 예 / 1 아니오), percent = 고른 쪽 확률(51~99, 없으면 70)
// 객관식: choice = 고른 선택지 번호, confidence = low | mid | high
export async function savePrediction(
  _prev: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const questionId = String(formData.get("question_id") ?? "");
  const choice = Number(formData.get("choice"));
  const reason = String(formData.get("reason") ?? "").trim();

  const { data } = await supabase
    .from("questions")
    .select("status, close_at, type, options, is_public")
    .eq("id", questionId)
    .maybeSingle();
  if (!data) return { error: "질문을 찾을 수 없어요." };
  const question = data as Pick<
    Question,
    "status" | "close_at" | "type" | "options" | "is_public"
  >;
  if (!isAccepting(question)) return { error: "예측이 마감된 질문이에요." };

  const n = question.options.length;
  if (!Number.isInteger(choice) || choice < 0 || choice >= n) {
    return { error: "선택지를 골라 주세요." };
  }

  let p: number;
  if (question.type === "ox") {
    const rawPercent = formData.get("percent");
    const percent = rawPercent ? Number(rawPercent) : OX_QUICK_P * 100;
    if (!Number.isInteger(percent) || percent < 51 || percent > 99) {
      return { error: "확률은 51~99% 사이로 골라 주세요." };
    }
    p = percent / 100;
  } else {
    const level = CONFIDENCE_LEVELS.find(
      (c) => c.value === formData.get("confidence"),
    );
    if (!level) return { error: "확신도를 골라 주세요." };
    p = level.p;
  }

  if (reason.length > 100) return { error: "근거는 100자 이내로 써 주세요." };

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      probs: buildProbs(n, choice, p),
    },
    { onConflict: "user_id,question_id" },
  );

  if (error) {
    // 마감 직후에 저장하면 DB 정책(RLS)에서 거부된다.
    if (error.code === "42501") return { error: "예측이 마감된 질문이에요." };
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  // 한 줄 근거는 그 질문의 토론에 첫 댓글로 공개한다.
  if (reason) {
    const { count } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId)
      .eq("user_id", user.id)
      .is("parent_id", null);
    if (!count) {
      await supabase
        .from("comments")
        .insert({ question_id: questionId, user_id: user.id, body: reason });
    }
  }

  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/");
  revalidatePath("/me");
  return { savedAt: Date.now() };
}
