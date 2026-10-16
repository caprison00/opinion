import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getFeaturedBadges } from "@/lib/badges";
import { isTier, topPercent } from "@/lib/tiers";
import { MobileMenu, UserMenu, type AccountInfo } from "./AccountMenu";
import Logo from "./Logo";
import NavLinks, { MobileNavLinks } from "./NavLinks";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import { button, container, scoreText } from "./ui";

type Stats = {
  nickname: string;
  tier: string;
  season: string;
  season_rank: number | null;
  season_eligible: number | null;
  season_total: number;
  season_count: number;
};

// 내 메뉴에 보여줄 요약 (닉네임·티어·대표 뱃지·이번 시즌 한 줄·개수)
async function getAccount(
  supabase: Awaited<ReturnType<typeof getViewer>>["supabase"],
  id: string,
): Promise<AccountInfo | null> {
  const [{ data }, featured, { count: badgeCount }, { count: openCount }] =
    await Promise.all([
      supabase.rpc("profile_stats", { p_user: id }),
      getFeaturedBadges(supabase, [id]),
      supabase
        .from("user_badges")
        .select("badge_key", { count: "exact", head: true })
        .eq("user_id", id)
        .gt("level", 0),
      supabase
        .from("predictions")
        .select("id, questions!inner(status)", { count: "exact", head: true })
        .eq("user_id", id)
        .in("questions.status", ["open", "closed"]),
    ]);
  const s = data as Stats | null;
  if (!s?.nickname) return null;

  const month = Number(s.season.slice(5));
  const rank =
    s.season_rank && s.season_eligible
      ? ` · ${s.season_rank}위 · 상위 ${topPercent(s.season_rank, s.season_eligible)}%`
      : ` · 판정 ${s.season_count}건`;
  return {
    id,
    nickname: s.nickname,
    tier: isTier(s.tier) ? s.tier : "newbie",
    badge: featured.get(id) ?? null,
    season: `${month}월 시즌 ${scoreText(s.season_total)}점${rank}`,
    openCount: openCount ?? 0,
    badgeCount: badgeCount ?? 0,
  };
}

export default async function Header() {
  const { supabase, user, isAdmin } = await getViewer();
  const me = user ? await getAccount(supabase, user.id) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md">
      <div
        className={`${container} flex h-[52px] items-center justify-between md:h-16`}
      >
        <div className="flex items-center gap-6">
          <Logo />
          <NavLinks />
        </div>

        {/* PC: 작은 검색창 + 화면 모드 + 닉네임 메뉴 (또는 로그인) */}
        <div className="hidden items-center gap-1.5 md:flex">
          <div className="mr-1.5">
            <SearchBox compact />
          </div>
          <ThemeToggle />
          {me ? (
            <UserMenu me={me} isAdmin={isAdmin} />
          ) : user ? (
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

        {/* 모바일: 랭킹 · 검색 + ☰ */}
        <div className="flex items-center gap-0.5 md:hidden">
          <MobileNavLinks />
          <MobileMenu me={me} isAdmin={isAdmin} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
