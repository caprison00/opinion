import Link from "next/link";
import {
  Change,
  Locked,
  Participants,
  ProbScale,
} from "@/components/CrowdBits";
import CategoryRail from "@/components/CategoryRail";
import EmptyState from "@/components/EmptyState";
import { ChevronRightIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import QuestionCard from "@/components/QuestionCard";
import Rotator from "@/components/Rotator";
import InfoTip from "@/components/InfoTip";
import { Thumb } from "@/components/QuestionImage";
import { card, pillBar, scoreText, textTab } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  changeOf,
  currentSeason,
  EMPTY_BOARD,
  getBoards,
  type Board,
  type Issue,
} from "@/lib/board";
import { pickImage, type PickedImage } from "@/lib/images";
import {
  CATEGORIES,
  categoryLabel,
  dDay,
  formatDate,
  isCategory,
  type Category,
  outcomeLabel,
  stanceOf,
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

// 한국 시간 기준 월·일 (판정 일정 달력 칩)
function kstMonthDay(iso: string) {
  const [month, day] = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  })
    .format(new Date(iso))
    .split("/");
  return { month, day };
}

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
      .eq("is_public", true)
      .eq("status", "open")
      .gt("close_at", nowIso)
      .order("close_at", { ascending: true }),
    // 최근 7일 안에 판정된 질문 (어제 판정된 질문이 없으면 이것으로 대신 보여준다)
    supabase
      .from("questions")
      .select("*")
      .eq("is_public", true)
      .eq("status", "resolved")
      .gte("resolved_at", new Date(today.getTime() - 7 * DAY).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(10),
    supabase
      .from("questions")
      .select("*")
      .eq("is_public", true)
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
  const [{ data: issueData }, boards] = await Promise.all([
    issueIds.length
      ? supabase.from("issues").select("*").in("id", issueIds)
      : Promise.resolve({ data: [] }),
    getBoards(supabase, [
      ...open.map((q) => q.id),
      ...resolvedList.map((q) => q.id),
      ...upcoming.map((q) => q.id),
    ]),
  ]);
  const boardOf = (id: string) => boards.get(id) ?? EMPTY_BOARD;
  const issueById = new Map(
    ((issueData ?? []) as Issue[]).map((i) => [i.id, i]),
  );
  const imageOf = (q: Question) =>
    pickImage(q, q.issue_id ? issueById.get(q.issue_id) : null);

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
        questions: qs,
        participants: sum((b) => b.participants),
      };
    })
    .filter((h) => h.questions.length > 0)
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 3);

  const tabs = [{ value: null, label: "핫이슈" }, ...CATEGORIES];
  // 분야별 진행 중 공개 질문 수 (PC 왼쪽 메뉴)
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.value,
      open.filter((q) => q.category === c.value).length,
    ]),
  ) as Record<Category, number>;
  const currentLabel = category
    ? CATEGORIES.find((c) => c.value === category)?.label
    : null;
  const categoryQuestions = category
    ? open.filter((q) => q.category === category)
    : [];
  const closingSoon = open.slice(0, 6);
  // 최근 7일 안에 공개된 질문 중 가장 최근 6개를, 먼저 공개한 순서대로
  const newest = open
    .filter((q) => new Date(q.open_at).getTime() > Date.now() - 7 * DAY)
    .sort((a, b) => b.open_at.localeCompare(a.open_at))
    .slice(0, 6)
    .reverse();

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
    <PageShell wide>
      {deleted && !user && (
        <p className="mb-6 rounded-xl bg-bg-alt px-4 py-3 t-label-1 text-label-neutral">
          탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}
      {!user && (
        <section className="mb-8 flex flex-col gap-4 pt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="t-title-2 md:t-display-2">
              오늘, <span className="hl">무엇이 일어날까요?</span>
            </h1>
            <p className="mt-2 t-body-2 text-label-neutral md:t-body-1">
              돈은 걸지 않아요. 확률로 예측하고, 맞힐수록 점수와 티어가 쌓여요.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-12 shrink-0 items-center self-start rounded-xl bg-brand px-6 t-label-1 !font-bold text-white transition-colors hover:bg-brand-strong md:self-auto"
          >
            로그인하고 시작하기
          </Link>
        </section>
      )}

      {/* 1024px 미만: 가로 분야 탭(핫이슈 + 9개 분야). 스크롤해도 상단 메뉴 아래에 붙어 있다.
          1024px 이상은 왼쪽 세로 메뉴(CategoryRail) */}
      <nav
        aria-label="분야"
        className="sticky top-[52px] z-10 -mx-4 bg-bg/95 px-4 py-2 backdrop-blur-md md:top-16 md:-mx-6 md:px-6 lg:hidden"
      >
        <div className={`scroll-row ${pillBar}`}>
          {tabs.map((tab) => {
            const active = tab.value === category;
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/?category=${tab.value}` : "/"}
                aria-current={active ? "page" : undefined}
                className={`${textTab(active)} shrink-0 gap-1`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-0 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:gap-8">
        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <CategoryRail active={category} counts={counts} />
        </div>
        <div className="flex min-w-0 flex-col gap-10">
          {/* 좁은 화면: 내 시즌 티어·랭킹 바로가기를 맨 위에 */}
          {season && (
            <div className="-mb-4 lg:hidden">
              <SeasonBox season={season} />
            </div>
          )}
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
                <CardGrid
                  questions={categoryQuestions}
                  boardOf={boardOf}
                  imageOf={imageOf}
                />
              )}
            </section>
          ) : (
            <>
              {/* 이슈 묶음마다 이슈 이름을 칸 제목으로 */}
              {hotIssues.map((h) => (
                <section key={h.issue.id}>
                  <SectionTitle title={h.issue.title} />
                  <IssueCard
                    issue={h.issue}
                    questions={h.questions}
                    boardOf={boardOf}
                  />
                </section>
              ))}

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
                      <MovingRow
                        key={q.id}
                        q={q}
                        board={boardOf(q.id)}
                        image={imageOf(q)}
                      />
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
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                  <CardGrid
                    questions={closingSoon}
                    boardOf={boardOf}
                    imageOf={imageOf}
                  />
                )}
              </section>

              {newest.length > 0 && (
                <section>
                  <SectionTitle
                    title="새로 공개된 질문"
                    hint="최근 일주일 동안 새로 열린 질문이에요. 공개된 순서대로 보여요."
                  />
                  <CardGrid
                    questions={newest}
                    boardOf={boardOf}
                    imageOf={imageOf}
                  />
                </section>
              )}
            </>
          )}
        </div>

        {/* 사이드바: PC는 오른쪽, 좁은 화면은 본문 아래 */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <SeasonBox season={season} />
          </div>

          <section className={`${card} p-5`}>
            <h2 className="t-label-1 !font-extrabold">트렌딩 TOP 5</h2>
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
                      <span className="w-5 shrink-0 num-s text-primary">
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
            <h2 className="t-label-1 !font-extrabold">판정 예정</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 t-label-1 text-label-alt">
                판정을 기다리는 질문이 없어요.
              </p>
            ) : (
              <ul className="mt-3.5 flex flex-col gap-3.5">
                {upcoming.map((q) => {
                  const d = kstMonthDay(q.resolve_at);
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/questions/${q.id}`}
                        className="group grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3"
                      >
                        <span
                          className="flex h-11 flex-col items-center justify-center rounded-xl bg-bg-alt leading-none"
                          aria-hidden="true"
                        >
                          <span className="text-[10px] font-bold text-label-alt">
                            {d.month}월
                          </span>
                          <span className="mt-0.5 num text-[17px]">{d.day}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block line-clamp-2 t-label-1 text-label group-hover:text-primary">
                            {q.title}
                          </span>
                          <span className="block t-caption-1 text-label-alt">
                            {formatDate(q.resolve_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </PageShell>
  );
}

// 섹션 제목: 굵은 제목 + 설명은 ⓘ 툴팁
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <h2 className="relative mb-3.5 flex items-center gap-1 t-heading-2 lg:t-heading-1">
      {title}
      {hint && <InfoTip text={hint} />}
    </h2>
  );
}

function CardGrid({
  questions,
  boardOf,
  imageOf,
}: {
  questions: Question[];
  boardOf: (id: string) => Board;
  imageOf: (q: Question) => PickedImage | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          board={boardOf(q.id)}
          image={imageOf(q)}
        />
      ))}
    </div>
  );
}

// 핫이슈 카드 오른쪽 큰 확률 상자: 예측 전 "??%" + 참여하면 보여요, 예측 후 확률·24시간 변화량
// OX는 '예'의 확률, 객관식은 1위 선택지 (여론 공개 규칙: crowd가 null이면 숫자를 그리지 않는다)
function CrowdLine({ q, board }: { q: Question; board: Board }) {
  const crowd = board.crowd;
  const top = crowd
    ? q.type === "ox"
      ? { index: 0, label: q.options[0], pct: Math.round(crowd[0] * 100) }
      : stanceOf(crowd, q.options)
    : null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="t-caption-1 !font-bold text-white/75">
        모두의 예감{top ? ` · ${q.type === "ox" ? q.options[0] : `1위 ${top.label}`}` : ` · ${q.type === "ox" ? q.options[0] : "1위"}`}
      </p>
      <p className="num-l md:num-xl">{top ? `${top.pct}%` : "??%"}</p>
      {top ? (
        <>
          {q.type === "ox" && (
            <ProbScale value={top.pct} className="mt-1 bg-[linear-gradient(90deg,var(--c-no-track),rgb(255_255_255/0.12)_50%,var(--c-yes-track))]" />
          )}
          <span className="[&_*]:!text-hero-accent">
            <Change value={changeOf(board, top.index)} />
          </span>
        </>
      ) : (
        <span className="[&>span]:!text-white/80">
          <Locked />
        </span>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  questions,
  boardOf,
}: {
  issue: Issue;
  questions: Question[];
  boardOf: (id: string) => Board;
}) {
  // 롤링할 때 질문마다 자기 사진(없으면 이슈 묶음 사진)이 함께 바뀐다
  const images = questions.map((q) => pickImage(q, issue));
  const anyImage = images.some(Boolean);
  const context = issue.context_lines.length > 0 && (
    <ol className="flex flex-col gap-0.5 rounded-xl bg-white/[0.06] px-3 py-2.5 md:bg-transparent md:p-0">
      {issue.context_lines.map((line, i) => (
        <li
          key={i}
          className="flex gap-2 t-caption-1 text-white/80 md:t-label-2 md:!font-normal"
        >
          <span className="num text-hero-accent">{i + 1}</span>
          <span className="min-w-0 truncate md:whitespace-normal">{line}</span>
        </li>
      ))}
    </ol>
  );
  // 사진: 휴대폰은 제목 옆 작은 정사각형, PC는 왼쪽 세로 띠
  const imageBox =
    "h-[72px] w-[72px] rounded-xl md:h-auto md:w-[160px] md:self-stretch md:rounded-none";

  const slides = questions.map((q, i) => {
    const board = boardOf(q.id);
    const image = images[i];
    return (
      <Link
        key={q.id}
        href={`/questions/${q.id}`}
        className="group flex h-full flex-col gap-3 p-3.5 md:flex-row md:gap-0 md:p-0"
      >
        <div className="flex gap-3 md:contents">
          {image ? (
            <Thumb image={image} className={imageBox} />
          ) : (
            anyImage && (
              <div className={`${imageBox} shrink-0 bg-white/[0.08]`} aria-hidden="true" />
            )
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-3 md:px-6 md:py-6">
            <div className="hidden md:block">{context}</div>
            <p className="flex items-center justify-between gap-2 t-caption-1 !font-bold text-white/75">
              <span>{categoryLabel(q.category)}</span>
              <span className="num-s text-white md:hidden">{dDay(q.close_at)}</span>
            </p>
            <h3 className="line-clamp-2 t-body-1 !font-extrabold text-white group-hover:underline md:line-clamp-none md:t-heading-1">
              {q.title}
            </h3>
            <p className="mt-auto hidden items-center gap-3.5 t-label-2 text-white/80 md:flex">
              <Participants n={board.participants} />
              <span className="num-s text-white">{dDay(q.close_at)}</span>
            </p>
          </div>
        </div>
        <div className="md:hidden">{context}</div>
        {/* 오른쪽 큰 확률 상자 (휴대폰은 아래 한 줄) */}
        <div className="flex items-center justify-between gap-3 md:m-4 md:ml-0 md:w-[200px] md:shrink-0 md:flex-col md:items-stretch md:justify-center md:rounded-[18px] md:bg-white/[0.06] md:p-5">
          <div className="flex items-center gap-3 md:block">
            <CrowdLine q={q} board={board} />
            <span className="t-caption-1 text-white/75 md:hidden">
              <Participants n={board.participants} />
            </span>
          </div>
          <span className="inline-flex h-11 shrink-0 items-center justify-center gap-0.5 rounded-xl bg-yes px-3.5 t-label-1 !font-extrabold text-white md:mt-4 md:w-full">
            예측하러 가기
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </div>
      </Link>
    );
  });

  return (
    <article className="overflow-hidden rounded-[20px] bg-hero pb-2 text-white md:rounded-3xl md:pb-3">
      <Rotator
        slides={slides}
        label={`${issue.title} 질문`}
        onDark
        controlsClassName={`justify-center px-4 md:justify-start md:px-5 ${anyImage ? "md:pl-[176px]" : ""}`}
      />
    </article>
  );
}

function MovingRow({
  q,
  board,
  image,
}: {
  q: Question;
  board: Board;
  image: PickedImage | null;
}) {
  const top = board.crowd
    ? q.type === "ox"
      ? { index: 0, label: q.options[0], pct: Math.round(board.crowd[0] * 100) }
      : stanceOf(board.crowd, q.options)
    : null;
  return (
    <li>
      <Link
        href={`/questions/${q.id}`}
        className="group flex items-center justify-between gap-3.5 px-4 py-3 md:px-5 md:py-4"
      >
        {image && <Thumb image={image} className="h-11 w-11 rounded-[10px]" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 t-caption-1 !font-semibold text-label-alt">
            {categoryLabel(q.category)} ·{" "}
            <Participants n={board.participants} />
          </p>
          <p className="mt-0.5 line-clamp-2 t-body-3 !font-bold text-label group-hover:text-primary md:line-clamp-1 md:t-body-2 md:!font-bold">
            {q.title}
          </p>
        </div>
        {top ? (
          <div className="shrink-0 text-right">
            <p className="t-label-1 !font-extrabold text-label">
              {top.label} <span className="num">{top.pct}%</span>
            </p>
            <Change value={changeOf(board, top.index)} />
          </div>
        ) : (
          // 예측하지 않은 질문은 숫자·방향 없이 표시만 한다 (여론 공개 규칙)
          <span className="shrink-0 rounded-lg bg-no-soft px-2.5 py-1 t-caption-1 !font-extrabold text-no-ink">
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
  // OX '아니오' 결과는 주황, 그 밖(예·객관식 정답)은 파랑
  const isNo = q.type === "ox" && q.outcome_index === 1;
  return (
    <li>
      <Link
        href={`/questions/${q.id}`}
        className={`${card} group flex h-full flex-col gap-3.5 p-4 md:p-5`}
      >
        <p className="line-clamp-2 t-body-3 !font-bold text-label group-hover:text-primary">
          {q.title}
        </p>
        <p className="mt-auto flex items-center justify-between gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 t-label-2 !font-extrabold ${
              isNo ? "bg-no-soft text-no-ink" : "bg-yes-soft text-yes-ink"
            }`}
          >
            결과 {answer}
          </span>
          <span className="t-label-2 text-label-neutral">
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

// 이번 시즌(달) 남은 날: D-N (한국 시간 기준 말일까지)
function seasonLeft() {
  const [y, m] = currentSeason().split("-").map(Number);
  const end = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+09:00`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return dDay(end.toISOString());
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
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="t-label-1 !font-extrabold">{month}월 시즌</p>
        <span className="num-s text-label-neutral">{seasonLeft()}</span>
      </div>
      {season ? (
        <>
          <p className="mt-3 num-l text-[40px] md:text-[44px]">
            {scoreText(season.total)}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 t-label-2 text-label-neutral">
            <span className="!font-extrabold text-label">{tierLabel(season.tier)}</span>
            {season.rank !== null && (
              <span>
                · {season.rank}위 · 상위{" "}
                {topPercent(season.rank, season.eligible)}%
              </span>
            )}
          </p>
          <p className="mt-1 t-caption-1 text-label-alt">
            이번 달 판정된 예측 {season.count}건
            {season.count < SEASON_MIN &&
              ` · ${SEASON_MIN}건부터 랭킹·티어에 올라요`}
          </p>
        </>
      ) : (
        <p className="mt-2 t-body-2 !font-semibold">
          로그인하고 랭킹에 도전해 보세요
        </p>
      )}
      <Link
        href={season ? "/ranking" : "/login"}
        className="mt-4 flex h-11 items-center justify-center gap-1 rounded-xl bg-brand t-label-1 !font-bold text-white transition-colors hover:bg-brand-strong"
      >
        {season ? "랭킹 보기" : "로그인하기"}
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
