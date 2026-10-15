import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getFeaturedBadges } from "@/lib/badges";
import { getTiers } from "@/lib/tiers";
import BadgeIcon from "./BadgeIcon";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";
import TierMark from "./TierMark";
import { button, container } from "./ui";

export default async function Header() {
  const { supabase, user, isAdmin } = await getViewer();
  // 닉네임 + 이번 시즌 티어 (프로필로 이동)
  const [profile, tiers, featured] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("nickname")
          .eq("id", user.id)
          .maybeSingle()
          .then((r) => r.data as { nickname: string } | null),
        getTiers(supabase, [user.id]),
        getFeaturedBadges(supabase, [user.id]),
      ])
    : [null, null, null];
  const myBadge = user ? featured?.get(user.id) : undefined;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md">
      <div
        className={`${container} flex h-[52px] items-center justify-between md:h-16`}
      >
        <div className="flex items-center gap-6">
          <Logo />
          <NavLinks isAdmin={isAdmin} />
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-accent-blue px-3 py-1 t-label-2 !font-semibold text-primary md:hidden"
            >
              관리자
            </Link>
          )}
          {user && profile && (
            <Link
              href={`/users/${user.id}`}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-fill md:px-2"
              aria-label="내 프로필"
            >
              <TierMark tier={tiers?.get(user.id) ?? "newbie"} />
              {myBadge && (
                <BadgeIcon badgeKey={myBadge.key} level={myBadge.level} />
              )}
              <span className="hidden max-w-[120px] truncate t-label-1 !font-semibold text-label md:inline">
                {profile.nickname}
              </span>
            </Link>
          )}
          {user ? (
            <form action="/auth/signout" method="post">
              <button className="rounded-lg px-2 py-1.5 t-label-1 text-label-alt transition-colors hover:bg-fill">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/login" className={button.smallPrimary}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
