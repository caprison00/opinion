"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import {
  CHOICE_MAX,
  CHOICE_MIN,
  findBannedWord,
  isCategory,
  OX_OPTIONS,
} from "@/lib/questions";

export type CreateQuestionState = { error?: string; ok?: boolean };

// <input type="datetime-local"> 값은 시간대가 없으므로 한국 시간으로 해석한다.
function parseKst(value: FormDataEntryValue | null) {
  const s = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const date = new Date(`${s}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

type QuestionInput = {
  title: string;
  description: string;
  category: string;
  resolution_source: string;
  close_at: string;
  resolve_at: string;
  type: "ox" | "choice";
  options: string[];
  issue_id: string | null;
};

// 질문 만들기·수정에서 같이 쓰는 입력 검사
function parseQuestion(
  formData: FormData,
): { data: QuestionInput } | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = formData.get("category");
  const resolutionSource = String(
    formData.get("resolution_source") ?? "",
  ).trim();
  const closeAt = parseKst(formData.get("close_at"));
  const resolveAt = parseKst(formData.get("resolve_at"));
  const type = formData.get("type") === "choice" ? "choice" : "ox";
  const options =
    type === "ox"
      ? OX_OPTIONS
      : formData
          .getAll("options")
          .map((o) => String(o).trim())
          .filter(Boolean);

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

  if (type === "choice") {
    if (options.length < CHOICE_MIN || options.length > CHOICE_MAX) {
      return {
        error: `객관식 선택지는 ${CHOICE_MIN}~${CHOICE_MAX}개를 채워 주세요.`,
      };
    }
    if (new Set(options).size !== options.length) {
      return { error: "선택지가 겹치지 않게 써 주세요." };
    }
    if (options.some((o) => o.length > 30)) {
      return { error: "선택지는 30자 이내로 써 주세요." };
    }
  }

  const banned = findBannedWord(`${title} ${description} ${options.join(" ")}`);
  if (banned) {
    return {
      error: `국내 공직선거·정당 관련 질문은 만들 수 없어요. (포함된 단어: "${banned}")`,
    };
  }

  return {
    data: {
      title,
      description,
      category,
      resolution_source: resolutionSource,
      close_at: closeAt.toISOString(),
      resolve_at: resolveAt.toISOString(),
      type,
      options,
      issue_id: String(formData.get("issue_id") ?? "") || null,
    },
  };
}

// 새 질문은 비공개로 저장된다. '비공개 질문'에서 확인·수정한 뒤 공개한다.
export async function createQuestion(
  _prev: CreateQuestionState,
  formData: FormData,
): Promise<CreateQuestionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 질문을 만들 수 있어요." };

  const parsed = parseQuestion(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("questions")
    .insert({ ...parsed.data, is_public: false });
  if (error) {
    return { error: `저장에 실패했어요: ${error.message}` };
  }

  revalidatePath("/admin");
  return { ok: true };
}

// 비공개 질문 수정 (공개된 질문은 고칠 수 없다)
export async function updatePrivateQuestion(
  _prev: CreateQuestionState,
  formData: FormData,
): Promise<CreateQuestionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const parsed = parseQuestion(formData);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("questions")
    .update(parsed.data)
    .eq("id", id)
    .eq("is_public", false)
    .select("id");
  if (error) return { error: `저장에 실패했어요: ${error.message}` };
  if (!data?.length) {
    return { error: "이미 공개된 질문이거나 찾을 수 없어요." };
  }

  revalidatePath("/admin");
  revalidatePath(`/questions/${id}`);
  return { ok: true };
}

// 비공개 질문 삭제
export async function deletePrivateQuestion(formData: FormData) {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user || !isAdmin) return;
  const id = String(formData.get("id") ?? "");
  await supabase.from("questions").delete().eq("id", id).eq("is_public", false);
  revalidatePath("/admin");
}

// 공개 전환: 이때부터 예측을 받는다 (예측 시작 시각 = 공개한 순간)
export async function publishQuestion(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const { data: q } = await supabase
    .from("questions")
    .select("close_at, is_public")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { error: "질문을 찾을 수 없어요." };
  if (q.is_public) return { error: "이미 공개된 질문이에요." };
  if (new Date(q.close_at) <= new Date()) {
    return {
      error: "예측 마감일이 지났어요. 수정에서 마감일을 바꾼 뒤 공개해 주세요.",
    };
  }

  const { error } = await supabase
    .from("questions")
    .update({ is_public: true, open_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `공개 전환 실패: ${error.message}` };

  revalidateQuestion(id);
  return { ok: true };
}

export type AdminActionState = { error?: string; ok?: boolean };

// 이슈 묶음: 제목 + 3줄 맥락 + 출처 링크
export async function createIssue(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const parsed = parseIssue(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("issues").insert(parsed);
  if (error) return { error: `저장에 실패했어요: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

// 이슈 묶음 수정 (제목·3줄 맥락·출처 링크)
export async function updateIssue(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const parsed = parseIssue(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("issues").update(parsed).eq("id", id);
  if (error) return { error: `저장에 실패했어요: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

// 이슈 묶음 삭제: 묶여 있던 질문은 지워지지 않고 '이슈 없음'이 된다.
export async function deleteIssue(formData: FormData) {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user || !isAdmin) return;
  const id = String(formData.get("id") ?? "");
  await supabase.from("issues").delete().eq("id", id);
  revalidatePath("/", "layout");
}

function parseIssue(formData: FormData):
  | {
      title: string;
      context_lines: string[];
      context_source_url: string | null;
    }
  | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const lines = formData
    .getAll("context")
    .map((l) => String(l).trim())
    .filter(Boolean);
  const url = String(formData.get("source_url") ?? "").trim();

  if (title.length < 2 || title.length > 80) {
    return { error: "이슈 이름은 2~80자로 써 주세요." };
  }
  if (lines.length > 3 || lines.some((l) => l.length > 100)) {
    return { error: "맥락은 3줄까지, 줄마다 100자 이내로 써 주세요." };
  }
  if (url && !/^https?:\/\/\S+$/.test(url)) {
    return { error: "출처 링크는 http:// 또는 https://로 시작해야 해요." };
  }
  const banned = findBannedWord(`${title} ${lines.join(" ")}`);
  if (banned) {
    return {
      error: `국내 공직선거·정당 관련 이슈는 만들 수 없어요. (포함된 단어: "${banned}")`,
    };
  }
  return { title, context_lines: lines, context_source_url: url || null };
}

// 질문을 이슈 묶음에 넣거나 뺀다
export async function setQuestionIssue(formData: FormData) {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user || !isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const issueId = String(formData.get("issue_id") ?? "") || null;
  await supabase.from("questions").update({ issue_id: issueId }).eq("id", id);
  revalidateQuestion(id);
}

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
  // result = "void" 또는 정답 선택지 번호("0", "1", …)
  const result = String(formData.get("result") ?? "");

  const { data: q } = await supabase
    .from("questions")
    .select("status, close_at, options")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { error: "질문을 찾을 수 없어요." };

  const answer = Number(result);
  if (
    result !== "void" &&
    !(Number.isInteger(answer) && answer >= 0 && answer < q.options.length)
  ) {
    return { error: "판정 결과가 올바르지 않아요." };
  }

  // 정답 판정은 예측이 잠긴 뒤(마감 후)에만 가능하다. 무효는 언제든 가능.
  const stillOpen = q.status === "open" && new Date(q.close_at) > new Date();
  if (result !== "void" && stillOpen) {
    return { error: "먼저 마감 처리한 뒤 판정해 주세요." };
  }

  // OX의 v1 결과 칸(outcome)은 DB 트리거가 정답 번호에 맞춰 함께 바꾼다.
  const update =
    result === "void"
      ? { status: "void", outcome_index: null }
      : { status: "resolved", outcome_index: answer };
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

// 모든 사용자의 뱃지를 다시 계산 (시즌 마스터는 매달 초에 한 번 눌러 주면 반영된다)
export async function refreshAllBadges() {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user || !isAdmin) return;
  await supabase.rpc("refresh_all_badges");
  revalidatePath("/", "layout");
}
