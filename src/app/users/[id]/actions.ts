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
}

// 새 뱃지 안내를 확인함
export async function markBadgesSeen() {
  const supabase = await createClient();
  await supabase.rpc("mark_badges_seen");
  revalidatePath("/", "layout");
}
