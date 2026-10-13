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
  const resolutionSource = String(
    formData.get("resolution_source") ?? "",
  ).trim();
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

export type AdminActionState = { error?: string };

// 마감 처리: 마감 시각 전이라도 예측을 더 받지 않는다.
export async function closeQuestion(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const { data: q } = await supabase
    .from("questions")
    .select("status, close_at")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { error: "질문을 찾을 수 없어요." };
  if (q.status !== "open")
    return { error: "진행 중인 질문만 마감할 수 있어요." };

  const now = new Date();
  const closeAt = new Date(q.close_at) < now ? q.close_at : now.toISOString();
  const { error } = await supabase
    .from("questions")
    .update({ status: "closed", close_at: closeAt })
    .eq("id", id);
  if (error) return { error: `마감 처리 실패: ${error.message}` };

  revalidateQuestion(id);
  return {};
}

// 결과 판정: yes / no 는 판정 완료, void 는 무효(채점 제외)
export async function resolveQuestion(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const result = String(formData.get("result") ?? "");
  if (!["yes", "no", "void"].includes(result)) {
    return { error: "판정 결과가 올바르지 않아요." };
  }

  const { data: q } = await supabase
    .from("questions")
    .select("status, close_at")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { error: "질문을 찾을 수 없어요." };

  // yes/no 판정은 예측이 잠긴 뒤(마감 후)에만 가능하다. 무효는 언제든 가능.
  const stillOpen = q.status === "open" && new Date(q.close_at) > new Date();
  if (result !== "void" && stillOpen) {
    return { error: "먼저 마감 처리한 뒤 판정해 주세요." };
  }

  const update =
    result === "void"
      ? { status: "void", outcome: null }
      : { status: "resolved", outcome: result };
  const { error } = await supabase
    .from("questions")
    .update(update)
    .eq("id", id);
  if (error) return { error: `판정 실패: ${error.message}` };

  revalidateQuestion(id);
  return {};
}

function revalidateQuestion(id: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath(`/questions/${id}`);
}
