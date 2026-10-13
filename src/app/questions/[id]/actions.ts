"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAccepting, type Question } from "@/lib/questions";

export type PredictionState = { error?: string; savedAt?: number };

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
  const probability = Number(formData.get("probability"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(probability) || probability < 1 || probability > 99) {
    return { error: "확률은 1~99% 사이로 골라 주세요." };
  }
  if (reason.length > 100) {
    return { error: "근거는 100자 이내로 써 주세요." };
  }

  const { data: question } = await supabase
    .from("questions")
    .select("status, close_at")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) return { error: "질문을 찾을 수 없어요." };
  if (!isAccepting(question as Pick<Question, "status" | "close_at">)) {
    return { error: "예측이 마감된 질문이에요." };
  }

  const { error } = await supabase.from("predictions").upsert(
    { user_id: user.id, question_id: questionId, probability, reason },
    { onConflict: "user_id,question_id" },
  );

  if (error) {
    // 마감 직후에 저장하면 DB 정책(RLS)에서 거부된다.
    if (error.code === "42501") return { error: "예측이 마감된 질문이에요." };
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/");
  return { savedAt: Date.now() };
}
