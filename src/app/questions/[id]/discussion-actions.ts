"use server";

import { revalidatePath } from "next/cache";
import { COMMENT_MAX, type ReactionKind } from "@/lib/discussion";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// DB가 금지어 등으로 거부하면(P0001) 그 문구를 그대로 보여준다.
function friendly(error: { code?: string; message: string }) {
  if (error.code === "P0001") return error.message;
  if (error.code === "23505") return "이미 처리됐어요.";
  return "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function addComment(
  questionId: string,
  body: string,
  parentId: string | null,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "로그인이 필요해요." };

  const text = body.trim();
  if (!text) return { error: "내용을 입력해 주세요." };
  if (text.length > COMMENT_MAX) {
    return { error: `${COMMENT_MAX}자 이내로 써 주세요.` };
  }

  const { error } = await supabase.from("comments").insert({
    question_id: questionId,
    user_id: user.id,
    parent_id: parentId,
    body: text,
  });
  if (error) return { error: friendly(error) };

  revalidatePath(`/questions/${questionId}`);
  return {};
}

export async function deleteComment(
  questionId: string,
  commentId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "로그인이 필요해요." };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) return { error: friendly(error) };

  revalidatePath(`/questions/${questionId}`);
  return {};
}

// 같은 리액션을 다시 누르면 취소, 다른 리액션을 누르면 바꾼다 (한 사람당 하나).
export async function react(
  questionId: string,
  commentId: string,
  kind: ReactionKind,
  current: ReactionKind | null,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "로그인이 필요해요." };

  const { error } =
    current === kind
      ? await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
      : await supabase
          .from("comment_reactions")
          .upsert(
            { comment_id: commentId, user_id: user.id, kind },
            { onConflict: "comment_id,user_id" },
          );
  if (error) return { error: friendly(error) };

  revalidatePath(`/questions/${questionId}`);
  return {};
}

export async function reportComment(
  questionId: string,
  commentId: string,
  reason: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "로그인이 필요해요." };

  const { error } = await supabase.from("reports").insert({
    comment_id: commentId,
    user_id: user.id,
    reason: reason.trim().slice(0, 200),
  });
  if (error) {
    if (error.code === "23505") return { error: "이미 신고한 댓글이에요." };
    return { error: friendly(error) };
  }

  revalidatePath(`/questions/${questionId}`);
  revalidatePath("/admin/reports");
  return {};
}
