import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import BadgeSettings from "@/app/users/[id]/BadgeSettings";
import BadgeShelf from "@/app/users/[id]/BadgeShelf";
import { getViewer } from "@/lib/auth";
import type { UserBadge } from "@/lib/badges";

export const metadata = { title: "내 뱃지" };

// 내 뱃지: 대표 뱃지·공개 설정 + 12종 진열장 (진행도 포함)
export default async function MyBadgesPage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const [{ data: prefs }, { data: badgeData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("featured_badge, show_badges")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_badges")
      .select("badge_key, level, progress, seen_level, earned_at")
      .eq("user_id", user.id),
  ]);
  const owned = (badgeData ?? []) as UserBadge[];
  const earned = owned.filter((b) => b.level > 0);
  const showBadges = prefs?.show_badges ?? true;
  const featured = (prefs?.featured_badge as string | null) ?? null;

  return (
    <PageShell narrow>
      <h1 className="t-heading-1 md:t-title-3">
        내 뱃지{" "}
        <span className="t-heading-2 text-label-assist">
          {earned.length}/12
        </span>
      </h1>

      <section className="mt-5">
        <BadgeSettings
          earned={earned}
          featured={featured}
          showBadges={showBadges}
        />
      </section>

      <section className="mt-8">
        <BadgeShelf
          owned={owned}
          isMe
          showBadges={showBadges}
          featured={featured}
        />
      </section>
    </PageShell>
  );
}
