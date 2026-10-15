import Link from "next/link";
import { markBadgesSeen } from "@/app/users/[id]/actions";
import { badgeTitle } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";
import BadgeIcon from "./BadgeIcon";

// 새로 받은(또는 단계가 오른) 뱃지가 있으면 화면 맨 위에 한 번 알려준다. "확인"을 누르면 사라진다.
export default async function NewBadgeBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_badges")
    .select("badge_key, level, seen_level")
    .eq("user_id", user.id)
    .gt("level", 0);
  const fresh = (
    (data ?? []) as {
      badge_key: string;
      level: number;
      seen_level: number;
    }[]
  ).filter((b) => b.level > b.seen_level);
  if (!fresh.length) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-accent bg-accent-soft px-4 py-3">
      <div className="flex -space-x-1">
        {fresh.slice(0, 4).map((b) => (
          <BadgeIcon
            key={b.badge_key}
            badgeKey={b.badge_key}
            level={b.level}
            size={28}
          />
        ))}
      </div>
      <p className="min-w-0 flex-1 t-label-1 text-label">
        <span className="!font-bold">새 뱃지를 받았어요!</span>{" "}
        {fresh.map((b) => badgeTitle(b.badge_key, b.level)).join(", ")}
      </p>
      <div className="flex gap-2">
        <Link
          href={`/users/${user.id}`}
          className="rounded-lg px-3 py-1.5 t-label-2 !font-semibold text-accent-ink hover:bg-accent/20"
        >
          진열장 보기
        </Link>
        <form action={markBadgesSeen}>
          <button className="rounded-lg bg-brand px-3 py-1.5 t-label-2 !font-semibold text-white hover:bg-brand-strong">
            확인
          </button>
        </form>
      </div>
    </div>
  );
}
