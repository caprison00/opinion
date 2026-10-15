import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import TierMark from "@/components/TierMark";
import { card, scoreColor, scoreText } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, isCategory } from "@/lib/questions";
import {
  isTier,
  SEASON_MIN,
  seasonLabel,
  tierLabel,
  topPercent,
} from "@/lib/tiers";

type Stats = {
  nickname: string;
  joined_at: string;
  season: string;
  tier: string;
  season_rank: number | null;
  season_eligible: number | null;
  season_total: number;
  season_count: number;
  total_score: number;
  scored_count: number;
  hit_rate: number | string | null;
  categories: {
    category: string;
    total: number;
    count: number;
    rank: number;
    n: number;
  }[];
};

export const metadata = { title: "프로필" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("profile_stats", { p_user: id }),
    supabase.auth.getUser(),
  ]);
  const s = data as Stats | null;
  if (!s) notFound();

  const tier = isTier(s.tier) ? s.tier : "newbie";
  const isMe = auth.user?.id === id;
  const seasonPct =
    s.season_rank && s.season_eligible
      ? topPercent(s.season_rank, s.season_eligible)
      : null;
  const hitRate =
    s.hit_rate === null ? null : Math.round(Number(s.hit_rate) * 100);
  const month = Number(s.season.slice(5));

  return (
    <PageShell narrow>
      <section className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full t-title-3"
          style={{
            color: tier === "newbie" ? undefined : `var(--tier-${tier})`,
            backgroundColor:
              tier === "newbie"
                ? "var(--color-fill)"
                : `color-mix(in srgb, var(--tier-${tier}) 14%, transparent)`,
          }}
          aria-hidden="true"
        >
          {s.nickname.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TierMark tier={tier} size="md" />
            {isMe && <span className="t-label-2 text-primary">나</span>}
          </div>
          <h1 className="mt-1 truncate t-heading-1 md:t-title-3">
            {s.nickname}
          </h1>
        </div>
      </section>

      <section className="mt-6 rounded-[20px] bg-gradient-to-br from-brand to-primary-deep p-5 text-white md:p-6">
        <p className="t-label-2 text-white/75">{seasonLabel(s.season)} 시즌</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <p className="t-title-2 tabular-nums">
            {scoreText(s.season_total)}점
          </p>
          <p className="pb-1 t-label-1 text-white/85">
            {s.season_rank
              ? `${s.season_rank}위 · 상위 ${seasonPct}% · ${tierLabel(tier)}`
              : `판정 ${s.season_count}/${SEASON_MIN}건 · 새내기`}
          </p>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="전체 누적 점수">
          <span className={scoreColor(s.total_score)}>
            {scoreText(s.total_score)}
          </span>
        </Stat>
        <Stat label="적중률">{hitRate === null ? "–" : `${hitRate}%`}</Stat>
        <Stat label="판정된 예측">{s.scored_count}</Stat>
      </section>
      <p className="mt-2 t-caption-1 text-label-alt">
        적중률은 판정된 질문에서 정답을 가장 높은 확률로 고른 비율이에요.
      </p>

      <section className="mt-8">
        <h2 className="t-heading-2">{month}월 분야별 순위</h2>
        {s.categories.length === 0 ? (
          <p className="mt-3 rounded-xl bg-bg-alt py-8 text-center t-label-1 text-label-alt">
            이번 시즌에 판정된 예측이 아직 없어요.
          </p>
        ) : (
          <ul className={`${card} mt-3 divide-y divide-line-alt`}>
            {s.categories.map((c) => (
              <li
                key={c.category}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="t-body-2 !font-semibold">
                    {isCategory(c.category)
                      ? categoryLabel(c.category)
                      : c.category}
                  </p>
                  <p className="t-caption-1 text-label-alt">
                    판정 {c.count}건 · {scoreText(c.total)}점
                  </p>
                </div>
                <span className="t-body-2 !font-bold text-primary">
                  상위 {topPercent(c.rank, c.n)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex justify-center gap-2">
        <Link
          href="/ranking"
          className="rounded-lg px-3 py-2 t-label-1 text-label-alt hover:bg-fill"
        >
          랭킹 보기
        </Link>
        {isMe && (
          <Link
            href="/me"
            className="rounded-lg px-3 py-2 t-label-1 text-label-alt hover:bg-fill"
          >
            내 예측 보기
          </Link>
        )}
      </div>
    </PageShell>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-bg-alt p-4">
      <p className="t-caption-1 text-label-alt">{label}</p>
      <p className="mt-1 t-heading-1 tabular-nums">{children}</p>
    </div>
  );
}
