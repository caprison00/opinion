import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import TierMark from "@/components/TierMark";
import BadgeIcon from "@/components/BadgeIcon";
import { getFeaturedBadges, type FeaturedBadge } from "@/lib/badges";
import { card, chip, scoreColor, scoreText } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { currentSeason } from "@/lib/board";
import { CATEGORIES, categoryLabel, isCategory } from "@/lib/questions";
import {
  ACCURACY_MIN,
  isTier,
  SEASON_MIN,
  seasonLabel,
  TIERS,
  topPercent,
  type Tier,
} from "@/lib/tiers";

export const metadata = { title: "랭킹" };

type Mode = "total" | "accuracy";

type Row = {
  rank: number;
  user_id: string;
  nickname: string;
  total_score: number;
  scored_count: number;
  avg_score: number | string;
  eligible: number;
  tier: string;
};

// 이번 달 포함 최근 6개 시즌
function recentSeasons() {
  const [y, m] = currentSeason().split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; category?: string; season?: string }>;
}) {
  const params = await searchParams;
  const mode: Mode = params.mode === "accuracy" ? "accuracy" : "total";
  const category = isCategory(params.category) ? params.category : null;
  const seasons = recentSeasons();
  const season = seasons.includes(params.season ?? "")
    ? params.season!
    : seasons[0];
  const isCurrent = season === seasons[0];
  const min = mode === "accuracy" ? ACCURACY_MIN : SEASON_MIN;

  const { supabase, user } = await getViewer();
  const [{ data }, { data: myScoreData }] = await Promise.all([
    supabase.rpc("season_leaderboard", {
      p_season: season,
      p_mode: mode,
      p_category: category,
      p_limit: 100,
    }),
    user
      ? supabase
          .from("question_scores")
          .select("score, questions(category)")
          .eq("user_id", user.id)
          .eq("season", season)
      : Promise.resolve({ data: null }),
  ]);
  const all = (data ?? []) as Row[];
  const featured = await getFeaturedBadges(
    supabase,
    all.map((r) => r.user_id),
  );
  const me = user ? all.find((r) => r.user_id === user.id) : undefined;
  const rows = all.filter((r) => r.rank <= 100);
  const eligible = all[0]?.eligible ?? 0;

  // 내가 아직 대상이 아니면 몇 건이 더 필요한지
  const myCount = (
    (myScoreData ?? []) as unknown as {
      questions: { category: string } | null;
    }[]
  ).filter((s) => !category || s.questions?.category === category).length;

  const href = (
    next: Partial<{ mode: Mode; category: string | null; season: string }>,
  ) => {
    const p = new URLSearchParams();
    const m = next.mode ?? mode;
    const c = next.category === undefined ? category : next.category;
    const s = next.season ?? season;
    if (m !== "total") p.set("mode", m);
    if (c) p.set("category", c);
    if (s !== seasons[0]) p.set("season", s);
    const q = p.toString();
    return q ? `/ranking?${q}` : "/ranking";
  };

  return (
    <PageShell narrow>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-heading-1 md:t-title-3">랭킹</h1>
          <p className="mt-1 t-label-1 text-label-alt">
            {seasonLabel(season)} 시즌 · 그 달에 판정된 질문의 점수로 매겨요.
          </p>
        </div>
        <nav
          aria-label="시즌"
          className="scroll-row flex gap-1.5 overflow-x-auto"
        >
          {seasons.slice(0, 3).map((s) => (
            <Link
              key={s}
              href={href({ season: s })}
              aria-current={s === season ? "page" : undefined}
              className={`rounded-lg px-2.5 py-1.5 t-label-2 !font-semibold ${
                s === season
                  ? "bg-fill text-label"
                  : "text-label-alt hover:bg-fill-alt"
              }`}
            >
              {Number(s.slice(5))}월{s === seasons[0] && " (이번 달)"}
            </Link>
          ))}
        </nav>
      </div>

      {/* 탭: 누적 점수 / 정확도 */}
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-[14px] bg-bg-alt p-1">
        {(
          [
            {
              value: "total",
              label: "누적 점수",
              hint: `판정 ${SEASON_MIN}건 이상`,
            },
            {
              value: "accuracy",
              label: "정확도",
              hint: `평균 점수 · 판정 ${ACCURACY_MIN}건 이상`,
            },
          ] as const
        ).map((t) => (
          <Link
            key={t.value}
            href={href({ mode: t.value })}
            aria-current={mode === t.value ? "page" : undefined}
            className={`flex flex-col items-center rounded-[11px] py-2.5 transition-colors ${
              mode === t.value
                ? "bg-surface shadow-xsmall"
                : "text-label-alt hover:text-label"
            }`}
          >
            <span className="t-body-3 !font-extrabold">{t.label}</span>
            <span className="t-caption-1 text-label-alt">{t.hint}</span>
          </Link>
        ))}
      </div>

      {/* 분야 필터 */}
      <nav
        aria-label="분야"
        className="scroll-row -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {[{ value: null, label: "전체" }, ...CATEGORIES].map((c) => (
          <Link
            key={c.label}
            href={href({ category: c.value })}
            className={`${chip(c.value === category)} shrink-0 !h-9 !px-3.5`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            message={`${category ? `${categoryLabel(category)} 분야에서 ` : ""}아직 랭킹에 오른 사람이 없어요.`}
          />
        ) : (
          <ol className={`${card} divide-y divide-line-alt overflow-hidden`}>
            {rows.map((r) => (
              <RankRow
                badge={featured.get(r.user_id)}
                key={r.user_id}
                r={r}
                mode={mode}
                isMe={r.user_id === user?.id}
              />
            ))}
          </ol>
        )}
      </div>

      <details className="mt-6 rounded-[14px] bg-bg-alt px-4 py-3.5 t-label-1 text-label-neutral">
        <summary className="cursor-pointer !font-semibold">
          티어는 어떻게 정해지나요?
        </summary>
        <p className="mt-2 t-caption-1 text-label-alt">
          이번 달 누적 점수 순위로 정해요. 판정된 예측이 {SEASON_MIN}건 이상인
          사람이 대상이고, 매달 1일 새로 시작해요.
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          {TIERS.map((t) => (
            <li key={t.value} className="flex items-center gap-1.5 t-caption-1">
              <TierMark tier={t.value} />
              <span className="text-label-alt">{t.rule}</span>
            </li>
          ))}
        </ul>
      </details>

      {/* 내 순위: 항상 하단에 고정 */}
      {user && (
        <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom))] z-10 mt-6 md:bottom-4">
          <div className="rounded-[18px] border-2 border-yes bg-surface shadow-medium">
            {me ? (
              <ol>
                <RankRow
                  r={me}
                  mode={mode}
                  isMe
                  pinned
                  badge={featured.get(me.user_id)}
                />
              </ol>
            ) : (
              <p className="px-5 py-4 t-label-1 text-label-neutral">
                <span className="!font-semibold text-label">내 순위</span> ·{" "}
                {category ? `${categoryLabel(category)} 분야 ` : ""}판정된 예측{" "}
                <strong className="text-primary">{myCount}</strong>/{min}건
                {isCurrent
                  ? myCount >= min
                    ? " · 곧 랭킹에 반영돼요."
                    : ` · ${min - myCount}건 더 판정되면 랭킹에 올라요.`
                  : " · 이 시즌에는 랭킹 대상이 아니었어요."}
              </p>
            )}
          </div>
        </div>
      )}
      {eligible > 0 && (
        <p className="mt-3 text-center t-caption-1 text-label-assist">
          대상 {eligible}명
        </p>
      )}
    </PageShell>
  );
}

function RankRow({
  r,
  mode,
  isMe,
  pinned = false,
  badge,
}: {
  r: Row;
  mode: Mode;
  isMe: boolean;
  pinned?: boolean;
  badge?: FeaturedBadge;
}) {
  const pct = topPercent(r.rank, r.eligible);
  const tier: Tier = isTier(r.tier) ? r.tier : "newbie";
  const value =
    mode === "accuracy"
      ? Math.round(Number(r.avg_score) * 10) / 10
      : r.total_score;
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3.5 md:gap-4 md:px-5 ${
        isMe && !pinned ? "bg-yes-soft" : ""
      }`}
    >
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span
          className={`num flex h-9 min-w-9 items-center justify-center rounded-[10px] px-1.5 text-[16px] ${
            r.rank <= 3 ? "bg-brand text-white" : "bg-bg-alt text-label-neutral"
          }`}
        >
          {r.rank}
        </span>
        {pct !== null && (
          <span className="mt-1 text-[11px] !font-semibold text-label-alt tabular-nums">
            상위 {pct}%
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/users/${r.user_id}`}
          className="flex min-w-0 items-center gap-1.5 hover:underline"
        >
          <TierMark tier={tier} />
          {badge && <BadgeIcon badgeKey={badge.key} level={badge.level} />}
          <span className="truncate t-body-3 !font-extrabold">{r.nickname}</span>
          {isMe && (
            <span className="shrink-0 t-label-2 text-primary">(나)</span>
          )}
        </Link>
        <p className="t-caption-1 text-label-alt">
          판정 {r.scored_count}건
          {mode === "accuracy"
            ? ` · 누적 ${scoreText(r.total_score)}점`
            : ` · 평균 ${scoreText(Math.round(Number(r.avg_score)))}점`}
        </p>
      </div>
      <span
        className={`num shrink-0 text-[22px] ${scoreColor(value)}`}
      >
        {scoreText(value)}
        {mode === "accuracy" && <span className="font-sans t-caption-1"> 평균</span>}
      </span>
    </li>
  );
}
