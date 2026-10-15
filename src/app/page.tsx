import Link from "next/link";
import { Change, Locked, OxBar } from "@/components/CrowdBits";
import EmptyState from "@/components/EmptyState";
import { ChevronRightIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import QuestionCard from "@/components/QuestionCard";
import { card, chip, scoreText } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  changeOf,
  currentSeason,
  EMPTY_BOARD,
  getBoards,
  type Board,
  type Issue,
} from "@/lib/board";
import {
  CATEGORIES,
  categoryLabel,
  formatDate,
  isCategory,
  outcomeLabel,
  stanceOf,
  timeLeft,
  type Question,
} from "@/lib/questions";
import {
  isTier,
  SEASON_MIN,
  tierLabel,
  topPercent,
  type Tier,
} from "@/lib/tiers";

const DAY = 86_400_000;

// 한국 시간 오늘 0시
function kstMidnight() {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
  return new Date(`${d}T00:00:00+09:00`);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; deleted?: string }>;
}) {
  const { category: rawCategory, deleted } = await searchParams;
  const category = isCategory(rawCategory) ? rawCategory : null;
  const { supabase, user } = await getViewer();

  const today = kstMidnight();
  const nowIso = new Date().toISOString();
  const [
    { data: openData },
    { data: resolvedData },
    { data: upcomingData },
    { data: movingData },
    { data: trendingData },
    { data: seasonData },
    { data: rankData },
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("status", "open")
      .gt("close_at", nowIso)
      .order("close_at", { ascending: true }),
    // 최근 7일 안에 판정된 질문 (어제 판정된 질문이 없으면 이것으로 대신 보여준다)
    supabase
      .from("questions")
      .select("*")
      .eq("status", "resolved")
      .gte("resolved_at", new Date(today.getTime() - 7 * DAY).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(10),
    supabase
      .from("questions")
      .select("*")
      .in("status", ["open", "closed"])
      .order("resolve_at", { ascending: true })
      .limit(5),
    supabase.rpc("moving_questions", { p_limit: 5 }),
    supabase.rpc("trending_questions", { p_limit: 5 }),
    user
      ? supabase
          .from("question_scores")
          .select("score")
          .eq("user_id", user.id)
          .eq("season", currentSeason())
      : Promise.resolve({ data: null }),
    // 내 시즌 순위·티어 (1위 행 + 내 행이 돌아온다)
    user
      ? supabase.rpc("season_leaderboard", {
          p_season: currentSeason(),
          p_limit: 1,
        })
      : Promise.resolve({ data: null }),
  ]);

  const open = (openData ?? []) as Question[];
  const byId = new Map(open.map((q) => [q.id, q]));
  const recentResolved = (resolvedData ?? []) as Question[];
  const upcoming = (upcomingData ?? []) as Question[];
  const moving = ((movingData ?? []) as { question_id: string }[])
    .map((m) => byId.get(m.question_id))
    .filter((q): q is Question => !!q);
  const trending = ((trendingData ?? []) as { question_id: string }[])
    .map((t) => byId.get(t.question_id))
    .filter((q): q is Question => !!q);

  // 어제(한국 시간) 판정된 질문. 없으면 최근 판정된 질문 3개.
  const yesterday = recentResolved.filter((q) => {
    const t = new Date(q.resolved_at ?? q.resolve_at).getTime();
    return t >= today.getTime() - DAY && t < today.getTime();
  });
  const resolvedList = (yesterday.length ? yesterday : recentResolved).slice(
    0,
    4,
  );

  // 이슈 묶음: 진행 중 질문이 있는 이슈만
  const issueIds = [
    ...new Set(open.map((q) => q.issue_id).filter((x): x is string => !!x)),
  ];
  const { data: issueData } = issueIds.length
    ? await supabase.from("issues").select("*").in("id", issueIds)
    : { data: [] };

  const boards = await getBoards(supabase, [
    ...open.map((q) => q.id),
    ...resolvedList.map((q) => q.id),
    ...upcoming.map((q) => q.id),
  ]);
  const boardOf = (id: string) => boards.get(id) ?? EMPTY_BOARD;

  const hotIssues = ((issueData ?? []) as Issue[])
    .map((issue) => {
      const qs = open
        .filter((q) => q.issue_id === issue.id)
        .sort(
          (a, b) => boardOf(b.id).participants - boardOf(a.id).participants,
        );
      const sum = (f: (b: Board) => number) =>
        qs.reduce((a, q) => a + f(boardOf(q.id)), 0);
      return {
        issue,
        lead: qs[0],
        more: qs.length - 1,
        participants: sum((b) => b.participants),
        reactions: sum((b) => b.reactions),
      };
    })
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 3);

  const counts = new Map<string, number>();
  for (const q of open)
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  const tabs = [
    { value: null, label: "핫이슈", count: null },
    ...CATEGORIES.map((c) => ({ ...c, count: counts.get(c.value) ?? 0 })),
  ];
  const currentLabel = category
    ? CATEGORIES.find((c) => c.value === category)?.label
    : null;
  const categoryQuestions = category
    ? open.filter((q) => q.category === category)
    : [];
  const closingSoon = open.slice(0, 6);

  const seasonScores = (seasonData ?? []) as { score: number }[];
  const myRank = user
    ? (
        (rankData ?? []) as {
          user_id: string;
          rank: number;
          eligible: number;
          tier: string;
        }[]
      ).find((r) => r.user_id === user.id)
    : undefined;
  const season = user
    ? {
        total: seasonScores.reduce((a, s) => a + s.score, 0),
        count: seasonScores.length,
        rank: myRank?.rank ?? null,
        eligible: myRank?.eligible ?? 0,
        tier: (isTier(myRank?.tier) ? myRank.tier : "newbie") as Tier,
      }
    : null;

  return (
    <PageShell>
      {deleted && !user && (
        <p className="mb-6 rounded-xl bg-bg-alt px-4 py-3 t-label-1 text-label-neutral">
          탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}
      {!user && (
        <section className="mb-6 flex flex-col gap-4 rounded-[20px] bg-gradient-to-br from-brand to-primary-deep px-6 py-6 text-white md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <h1 className="t-heading-1">미래를 확률로 맞혀 보세요</h1>
            <p className="mt-1 t-body-3 text-white/80">
              돈은 걸지 않아요. 예측이 맞을수록 점수가 쌓이고, 랭킹에 올라요.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 shrink-0 items-center self-start rounded-full bg-white px-5 t-label-1 !font-semibold text-brand transition-colors hover:bg-white/90 md:self-auto"
          >
            로그인하고 시작하기
          </Link>
        </section>
      )}

      {/* 상단 탭: 핫이슈 + 6개 분야. 스크롤해도 상단 메뉴 아래에 붙어 있다 */}
      <nav
        aria-label="분야"
        className="sticky top-[52px] z-10 -mx-4 border-b border-line bg-bg/95 backdrop-blur-md md:top-16 md:-mx-6"
      >
        <div className="scroll-row flex gap-2 overflow-x-auto px-4 py-3 md:px-6">
          {tabs.map((tab) => {
            const active = tab.value === category;
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/?category=${tab.value}` : "/"}
                aria-current={active ? "page" : undefined}
                className={`${chip(active)} shrink-0 gap-1.5`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`t-caption-1 tabular-nums ${
                      active ? "text-on-inverse/60" : "text-label-assist"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-10">
          {category ? (
            <section>
              <SectionTitle
                title={`${currentLabel} 질문`}
                hint="마감이 가까운 순서로 보여요."
              />
              {categoryQuestions.length === 0 ? (
                <EmptyState
                  message={`${currentLabel} 분야에 진행 중인 질문이 없어요.`}
                />
              ) : (
                <CardGrid questions={categoryQuestions} boardOf={boardOf} />
              )}
            </section>
          ) : (
            <>
              {hotIssues.length > 0 && (
                <section>
                  <SectionTitle title="오늘의 핫이슈" />
                  <div className="flex flex-col gap-4">
                    {hotIssues.map((h) => (
                      <IssueCard
                        key={h.issue.id}
                        issue={h.issue}
                        lead={h.lead}
                        board={boardOf(h.lead.id)}
                        more={h.more}
                        reactions={h.reactions}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle
                  title="지금 여론이 움직이는 질문"
                  hint="지난 24시간 동안 집단 확률이 크게 바뀐 순서예요."
                />
                {moving.length === 0 ? (
                  <EmptyState message="아직 크게 움직인 질문이 없어요." />
                ) : (
                  <ul className={`${card} divide-y divide-line-alt`}>
                    {moving.map((q) => (
                      <MovingRow key={q.id} q={q} board={boardOf(q.id)} />
                    ))}
                  </ul>
                )}
              </section>

              {resolvedList.length > 0 && (
                <section>
                  <SectionTitle
                    title={
                      yesterday.length ? "어제 판정된 질문" : "최근 판정된 질문"
                    }
                  />
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {resolvedList.map((q) => (
                      <ResolvedCard key={q.id} q={q} board={boardOf(q.id)} />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <SectionTitle
                  title="곧 마감되는 질문"
                  hint="마감이 가까운 순서로 보여요."
                />
                {closingSoon.length === 0 ? (
                  <EmptyState message="진행 중인 질문이 없어요." />
                ) : (
                  <CardGrid questions={closingSoon} boardOf={boardOf} />
                )}
              </section>
            </>
          )}
        </div>

        {/* 사이드바: PC는 오른쪽, 좁은 화면은 본문 아래 */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-36 lg:self-start">
          <SeasonBox season={season} />

          <section className={`${card} p-5`}>
            <h2 className="t-body-1 !font-bold">트렌딩 TOP 5</h2>
            {trending.length === 0 ? (
              <p className="mt-3 t-label-1 text-label-alt">
                진행 중인 질문이 없어요.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col gap-3">
                {trending.map((q, i) => (
                  <li key={q.id}>
                    <Link
                      href={`/questions/${q.id}`}
                      className="group flex gap-3"
                    >
                      <span className="w-4 shrink-0 t-body-2 !font-bold tabular-nums text-primary">
                        {i + 1}
                      </span>
                      <span className="line-clamp-2 t-label-1 text-label group-hover:text-primary">
                        {q.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="t-body-1 !font-bold">판정 예정</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 t-label-1 text-label-alt">
                판정을 기다리는 질문이 없어요.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {upcoming.map((q) => (
                  <li key={q.id}>
                    <Link href={`/questions/${q.id}`} className="group block">
                      <p className="t-caption-1 text-label-alt">
                        {formatDate(q.resolve_at)}
                      </p>
                      <p className="line-clamp-1 t-label-1 text-label group-hover:text-primary">
                        {q.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </PageShell>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="t-heading-2">{title}</h2>
      {hint && <p className="mt-0.5 t-label-2 text-label-alt">{hint}</p>}
    </div>
  );
}

function CardGrid({
  questions,
  boardOf,
}: {
  questions: Question[];
  boardOf: (id: string) => Board;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} board={boardOf(q.id)} />
      ))}
    </div>
  );
}

// 집단 확률 한 줄 요약: OX는 진영 막대, 객관식은 1위 선택지
function CrowdLine({ q, board }: { q: Question; board: Board }) {
  if (!board.crowd) return <Locked />;
  if (q.type === "ox") {
    return (
      <div className="flex flex-col gap-1">
        <OxBar yes={Math.round(board.crowd[0] * 100)} options={q.options} />
        <Change value={changeOf(board, 0)} className="self-end" />
      </div>
    );
  }
  const top = stanceOf(board.crowd, q.options);
  return (
    <p className="flex items-baseline gap-2 t-label-1">
      <span className="text-label-alt">1위</span>
      <span className="!font-bold text-primary">
        {top.label} {top.pct}%
      </span>
      <Change value={changeOf(board, top.index)} />
    </p>
  );
}

function IssueCard({
  issue,
  lead,
  board,
  more,
  reactions,
}: {
  issue: Issue;
  lead: Question;
  board: Board;
  more: number;
  reactions: number;
}) {
  return (
    <Link
      href={`/questions/${lead.id}`}
      className={`${card} group block p-5 transition duration-150 hover:shadow-medium md:p-6`}
    >
      <p className="flex items-center gap-2 t-caption-1 !font-semibold text-primary">
        <span className="rounded-md bg-accent-blue px-2 py-0.5">
          {issue.title}
        </span>
        <span className="text-label-alt">{categoryLabel(lead.category)}</span>
      </p>
      <h3 className="mt-3 t-heading-2 text-label group-hover:text-primary">
        {lead.title}
      </h3>
      {issue.context_lines.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-l-2 border-line pl-3">
          {issue.context_lines.map((line, i) => (
            <li key={i} className="t-body-3 text-label-neutral">
              {line}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <CrowdLine q={lead} board={board} />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-3 t-caption-1 text-label-alt">
        <span>{board.participants}명 예측</span>
        <span>리액션 {reactions}</span>
        <span>{timeLeft(lead.close_at)}</span>
        {more > 0 && (
          <span className="text-primary">같은 이슈 질문 {more}개 더</span>
        )}
      </p>
    </Link>
  );
}

function MovingRow({ q, board }: { q: Question; board: Board }) {
  const top = board.crowd
    ? q.type === "ox"
      ? { index: 0, label: q.options[0], pct: Math.round(board.crowd[0] * 100) }
      : stanceOf(board.crowd, q.options)
    : null;
  return (
    <li>
      <Link
        href={`/questions/${q.id}`}
        className="group flex items-center justify-between gap-3 px-5 py-4"
      >
        <div className="min-w-0">
          <p className="t-caption-1 text-label-alt">
            {categoryLabel(q.category)} · {board.participants}명 예측
          </p>
          <p className="mt-0.5 line-clamp-1 t-body-2 !font-semibold text-label group-hover:text-primary">
            {q.title}
          </p>
        </div>
        {top ? (
          <div className="shrink-0 text-right">
            <p className="t-body-2 !font-bold text-primary">
              {top.label} {top.pct}%
            </p>
            <Change value={changeOf(board, top.index)} />
          </div>
        ) : (
          // 예측하지 않은 질문은 숫자·방향 없이 표시만 한다 (여론 공개 규칙)
          <span className="shrink-0 rounded-md bg-accent-orange px-2 py-1 t-caption-1 !font-semibold text-caution-text">
            여론 변동 큼
          </span>
        )}
      </Link>
    </li>
  );
}

function ResolvedCard({ q, board }: { q: Question; board: Board }) {
  const answer = outcomeLabel(q);
  const rate = board.hitRate === null ? null : Math.round(board.hitRate * 100);
  return (
    <li>
      <Link
        href={`/questions/${q.id}`}
        className={`${card} group flex h-full flex-col p-4`}
      >
        <p className="line-clamp-2 t-body-3 !font-semibold text-label group-hover:text-primary">
          {q.title}
        </p>
        <p className="mt-auto flex items-baseline justify-between gap-2 pt-3">
          <span className="t-label-1 !font-bold text-primary">
            결과 {answer}
          </span>
          <span className="t-caption-1 text-label-neutral">
            {board.participants === 0 || rate === null
              ? "예측한 사람이 없었어요"
              : rate < 50
                ? `단 ${rate}%만 맞혔어요`
                : `${rate}%가 맞혔어요`}
          </span>
        </p>
      </Link>
    </li>
  );
}

function SeasonBox({
  season,
}: {
  season: {
    total: number;
    count: number;
    rank: number | null;
    eligible: number;
    tier: Tier;
  } | null;
}) {
  const month = Number(currentSeason().slice(5));
  return (
    <section className="rounded-2xl bg-gradient-to-br from-brand to-primary-deep p-5 text-white">
      <p className="t-label-2 text-white/75">{month}월 시즌</p>
      {season ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md bg-white/20 px-2 py-0.5 t-label-2 !font-bold">
              ◆ {tierLabel(season.tier)}
            </span>
            {season.rank !== null && (
              <span className="t-label-1 !font-semibold">
                {season.rank}위 · 상위{" "}
                {topPercent(season.rank, season.eligible)}%
              </span>
            )}
          </div>
          <p className="mt-2 t-title-3 tabular-nums">
            {scoreText(season.total)}점
          </p>
          <p className="mt-0.5 t-caption-1 text-white/75">
            이번 달 판정된 예측 {season.count}건
            {season.count < SEASON_MIN &&
              ` · ${SEASON_MIN}건부터 랭킹·티어에 올라요`}
          </p>
        </>
      ) : (
        <p className="mt-1 t-body-2 !font-semibold">
          로그인하고 랭킹에 도전해 보세요
        </p>
      )}
      <Link
        href={season ? "/ranking" : "/login"}
        className="mt-4 flex h-10 items-center justify-center gap-1 rounded-xl bg-white t-label-1 !font-bold text-brand transition-colors hover:bg-white/90"
      >
        {season ? "랭킹 보기" : "로그인하기"}
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
