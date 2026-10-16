"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { badgeDef } from "@/lib/badges";

// 닉네임 옆 대표 뱃지 고르기 (받은 뱃지만, 빈 값이면 해제)
export async function setFeaturedBadge(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const key = String(formData.get("badge") ?? "");
  if (key && badgeDef(key)) {
    const { data } = await supabase
      .from("user_badges")
      .select("level")
      .eq("user_id", user.id)
      .eq("badge_key", key)
      .maybeSingle();
    if (!data || data.level < 1) return;
  }

  await supabase
    .from("profiles")
    .update({ featured_badge: key && badgeDef(key) ? key : null })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}

// 수집한 뱃지를 다른 사람에게 보여줄지
export async function setShowBadges(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ show_badges: formData.get("show") === "on" })
    .eq("id", user.id);
  revalidatePath(`/users/${user.id}`);
  revalidatePath("/me/badges");
}

// 새 뱃지 안내를 확인함
export async function markBadgesSeen() {
  const supabase = await createClient();
  await supabase.rpc("mark_badges_seen");
  revalidatePath("/", "layout");
}

export type RenameState = { error?: string; ok?: boolean };

// 프로필에서 닉네임 바꾸기 (규칙은 가입 때와 같다: 2~12자, 한글·영문·숫자·밑줄)
export async function renameNickname(
  _prev: RenameState,
  formData: FormData,
): Promise<RenameState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (nickname.length < 2 || nickname.length > 12) {
    return { error: "닉네임은 2~12자로 정해 주세요." };
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요해요." };

  const { error } = await supabase
    .from("profiles")
    .update({ nickname })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505")
      return { error: "이미 사용 중인 닉네임이에요." };
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
