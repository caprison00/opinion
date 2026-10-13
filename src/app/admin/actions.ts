"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { findBannedWord, isCategory } from "@/lib/questions";

export type CreateQuestionState = { error?: string; ok?: boolean };

// <input type="datetime-local"> 값은 시간대가 없으므로 한국 시간으로 해석한다.
function parseKst(value: FormDataEntryValue | null) {
  const s = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const date = new Date(`${s}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createQuestion(
  _prev: CreateQuestionState,
  formData: FormData,
): Promise<CreateQuestionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 질문을 만들 수 있어요." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = formData.get("category");
  const resolutionSource = String(formData.get("resolution_source") ?? "").trim();
  const closeAt = parseKst(formData.get("close_at"));
  const resolveAt = parseKst(formData.get("resolve_at"));

  if (title.length < 5 || title.length > 120) {
    return { error: "질문 제목은 5~120자로 써 주세요." };
  }
  if (!isCategory(category)) {
    return { error: "카테고리를 골라 주세요." };
  }
  if (!resolutionSource) {
    return { error: "판정 출처를 써 주세요." };
  }
  if (!closeAt || !resolveAt) {
    return { error: "예측 마감일과 결과 확정일을 모두 정해 주세요." };
  }
  if (closeAt <= new Date()) {
    return { error: "예측 마감일은 지금보다 뒤여야 해요." };
  }
  if (resolveAt < closeAt) {
    return { error: "결과 확정일은 예측 마감일과 같거나 뒤여야 해요." };
  }

  const banned = findBannedWord(`${title} ${description}`);
  if (banned) {
    return {
      error: `국내 공직선거·정당 관련 질문은 만들 수 없어요. (포함된 단어: "${banned}")`,
    };
  }

  const { error } = await supabase.from("questions").insert({
    title,
    description,
    category,
    resolution_source: resolutionSource,
    close_at: closeAt.toISOString(),
    resolve_at: resolveAt.toISOString(),
  });

  if (error) {
    return { error: `저장에 실패했어요: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
