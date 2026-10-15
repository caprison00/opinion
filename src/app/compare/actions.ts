"use server";

import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { error?: string; done?: boolean };

const CHOICES = ["A", "B", "same"];

export async function sendFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  // 봇 방지: 사람에게 보이지 않는 칸이 채워져 있으면 저장하지 않는다
  if (String(formData.get("website") ?? "")) return { done: true };

  const wantClick = String(formData.get("want_click") ?? "");
  const trust = String(formData.get("trust") ?? "");
  const looksLike = String(formData.get("looks_like") ?? "")
    .trim()
    .slice(0, 200);
  const comment = String(formData.get("comment") ?? "")
    .trim()
    .slice(0, 500);
  const device = formData.get("device") === "mobile" ? "mobile" : "pc";

  if (!CHOICES.includes(wantClick) || !CHOICES.includes(trust)) {
    return { error: "2번과 3번 질문에 답해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("design_feedback").insert({
    looks_like: looksLike,
    want_click: wantClick,
    trust,
    comment,
    device,
  });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  return { done: true };
}
