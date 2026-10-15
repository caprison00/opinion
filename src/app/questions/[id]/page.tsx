import Link from "next/link";
import { notFound } from "next/navigation";
import { Change, Locked } from "@/components/CrowdBits";
import { ChevronLeftIcon, LockIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import TierMark from "@/components/TierMark";
import { button, card, scoreText } from "@/components/ui";
import {
  changeOf,
  EMPTY_BOARD,
  getBoards,
  maxGainNow,
  type Board,
  type Issue,
} from "@/lib/board";
import type { ReactionKind } from "@/lib/discussion";
import { createClient } from "@/lib/supabase/server";
import { getTiers } from "@/lib/tiers";
import { badgeDef, getFeaturedBadges, questionBadgeKeys } from "@/lib/badges";
import BadgeIcon from "@/components/BadgeIcon";
import { HeroImage } from "@/components/QuestionImage";
import { pickImage, type ImageFields } from "@/lib/images";
import type { Metadata } from "next";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  outcomeLabel,
  stanceOf,
  statusLabel,
  timeLeft,
  type Question,
} from "@/lib/questions";
import Discussion, { type DiscussionComment } from "./Discussion";
import PredictionForm from "./PredictionForm";
import TrendChart from "./TrendChart";

type CommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  profiles: { nickname: string } | null;
};

// 링크 공유 미리보기: 질문 제목 + 이미지(질문 → 이슈 묶음 순서)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("questions")
    .select("title, issue_id, image_url, image_credit, image_alt")
    .eq("id", id)
    .maybeSingle();
  if (!data) return {};
  const q = data as ImageFields & { title: string; issue_id: string | null };
  const { data: issue } = q.issue_id
    ? await supabase
        .from("issues")
        .select("title, image_url, image_credit, image_alt")
        .eq("id", q.issue_id)
        .maybeSingle()
    : { data: null };
  const image = pickImage(q, issue as (ImageFields & { title: string }) | null);
  const description = "당신의 예감은? 확률로 예측하고 결과를 확인해보세요.";
  return {
    title: q.title,
    description,
    openGraph: {
      title: q.title,
      description,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [
    { data },
    { data: commentData },
    { data: predictionData },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("comments")
      .select(
        "id, user_id, parent_id, body, created_at, profiles!comments_user_id_fkey(nickname)",
      )
      .eq("question_id", id)
      .order("created_at", { ascending: false }),
    // 여론 공개 규칙(DB): 내가 예측했거나 마감된 질문이면 모두, 아니면 내 예측만 돌아온다.
    supabase.from("predictions").select("user_id, probs").eq("question_id", id),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const q = data as Question;

  // 같은 이슈의 질문, 이슈 맥락, 확률 추이
  const [{ data: issueData }, { data: siblingData }, { data: historyData }] =
    await Promise.all([
      q.issue_id
        ? supabase.from("issues").select("*").eq("id", q.issue_id).maybeSingle()
        : Promise.resolve({ data: null }),
      q.issue_id
        ? supabase
            .from("questions")
            .select("*")
            .eq("is_public", true)
            .eq("issue_id", q.issue_id)
            .neq("id", q.id)
            .order("close_at", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: [] }),
      // 볼 수 없으면 DB 함수가 빈 목록을 돌려준다 (여론 공개 규칙)
      supabase.rpc("crowd_history", { qid: id, p_points: 40 }),
    ]);
  const issue = issueData as Issue | null;
  const image = pickImage(q, issue);
  const siblings = (siblingData ?? []) as Question[];
  const history = (
    (historyData ?? []) as { t: string; crowd: (number | string)[] | null }[]
  ).map((p) => ({ t: p.t, crowd: p.crowd?.map(Number) ?? null }));

  const boards = await getBoards(supabase, [
    q.id,
    ...siblings.map((s) => s.id),
  ]);
  const board = boards.get(q.id) ?? EMPTY_BOARD;
  const crowd = board.crowd;

  const stances = new Map(
    ((predictionData ?? []) as { user_id: string; probs: number[] }[]).map(
      (p) => [p.user_id, p.probs.map(Number)],
    ),
  );
  const myProbs = user ? (stances.get(user.id) ?? null) : null;
  const comments = (commentData ?? []) as unknown as CommentRow[];
  const hasMyComment =
    !!user && comments.some((c) => c.user_id === user.id && !c.parent_id);

  // 토론: 리액션 합계·내 리액션, 작성자 누적 점수
  const commentIds = comments.map((c) => c.id);
  const authorIds = [...new Set(comments.map((c) => c.user_id))];
  const [{ data: reactionData }, { data: authorScoreData }, tiers, featured] =
    await Promise.all([
      commentIds.length
        ? supabase
            .from("comment_reactions")
            .select("comment_id, user_id, kind")
            .in("comment_id", commentIds)
        : Promise.resolve({ data: [] }),
      authorIds.length
        ? supabase
            .from("question_scores")
            .select("user_id, score")
            .in("user_id", authorIds)
        : Promise.resolve({ data: [] }),
      getTiers(supabase, authorIds),
      getFeaturedBadges(supabase, authorIds),
    ]);
  const authorScores = new Map<string, number>();
  for (const r of (authorScoreData ?? []) as {
    user_id: string;
    score: number;
  }[]) {
    authorScores.set(r.user_id, (authorScores.get(r.user_id) ?? 0) + r.score);
  }
  const reactionRows = (reactionData ?? []) as {
    comment_id: string;
    user_id: string;
    kind: ReactionKind;
  }[];
  const discussion: DiscussionComment[] = comments.map((c) => {
    const mine = reactionRows.filter((r) => r.comment_id === c.id);
    return {
      id: c.id,
      userId: c.user_id,
      nickname: c.profiles?.nickname ?? "알 수 없음",
      tier: tiers.get(c.user_id) ?? "newbie",
      badge: featured.get(c.user_id) ?? null,
      body: c.body,
      createdAt: c.created_at,
      parentId: c.parent_id,
      reactions: {
        confident: mine.filter((r) => r.kind === "confident").length,
        anxious: mine.filter((r) => r.kind === "anxious").length,
        absurd: mine.filter((r) => r.kind === "absurd").length,
      },
      myReaction: mine.find((r) => r.user_id === user?.id)?.kind ?? null,
      authorScore: authorScores.get(c.user_id) ?? 0,
      stance: stances.get(c.user_id) ?? null,
    };
  });
  const accepting = isAccepting(q);
  const outcome = outcomeLabel(q);

  // 진영별 대표 근거: 그 선택지를 가장 높게 본 작성자의 댓글 중 리액션이 가장 많은 것
  const topReasons = q.options.map((_, i) => {
    const best = discussion
      .filter((c) => !c.parentId && c.stance)
      .filter((c) => stanceOf(c.stance!, q.options).index === i)
      .map((c) => ({
        c,
        total: c.reactions.confident + c.reactions.anxious + c.reactions.absurd,
      }))
      .sort((a, b) => b.total - a.total)[0];
    return best?.c ?? null;
  });

  let myScore: number | undefined;
  if (user && myProbs && q.status === "resolved") {
    const { data: scoreRow } = await supabase
      .from("prediction_scores")
      .select("score")
      .eq("question_id", q.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myScore = scoreRow?.score;
  }

  const locked = !myProbs && accepting;
  const discussionEl = (
    <Discussion
      questionId={q.id}
      comments={discussion}
      options={q.options}
      outcomeIndex={q.status === "resolved" ? q.outcome_index : null}
      viewerId={user?.id ?? null}
      locked={locked}
    />
  );
  const insightsEl = (
    <>
      <BattlePanel
        q={q}
        board={board}
        accepting={accepting}
        topReasons={topReasons}
      />

      <section>
        <h2 className="flex items-baseline gap-2.5 t-heading-2">
          <span className="sec-idx">02</span>확률 추이
        </h2>
        <div className="mt-3">
          {crowd ? (
            <TrendChart points={history} options={q.options} type={q.type} />
          ) : (
            <p className="rounded-xl bg-bg-alt py-8 text-center">
              <Locked />
            </p>
          )}
        </div>
      </section>
    </>
  );
  const maxGain = accepting ? maxGainNow(q, q.options.length) : 0;

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        목록으로
      </Link>

      {q.is_public === false && (
        <p className="mt-4 rounded-xl bg-accent-orange px-4 py-3 t-label-1 text-caution-text">
          비공개 질문 미리보기예요. 관리자에게만 보이고, 공개하기 전까지는
          예측과 댓글을 받지 않아요.{" "}
          <Link href="/admin?tab=private" className="!font-semibold underline">
            비공개 질문 관리로
          </Link>
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        {/* 본문: 질문, 맥락, 진영 대결, 추이, 토론 */}
        <article className="flex min-w-0 flex-col gap-8">
          <header>
            {image && (
              <div className="mb-5">
                <HeroImage image={image} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {issue && (
                <span className="rounded-full border border-line bg-accent-soft px-2.5 py-0.5 t-caption-1 !font-bold text-accent-ink">
                  {issue.title}
                </span>
              )}
              <span className="rounded-md bg-fill px-2 py-0.5 t-caption-1 !font-semibold text-label-neutral">
                {categoryLabel(q.category)}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 t-caption-1 !font-semibold ${
                  accepting
                    ? "bg-accent-orange text-caution-text"
                    : "bg-fill text-label-alt"
                }`}
              >
                {accepting ? timeLeft(q.close_at) : statusLabel(q)}
              </span>
            </div>
            <h1 className="mt-3 t-heading-1 md:t-title-2">{q.title}</h1>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 t-label-1">
              <dt className="text-label-alt">판정 출처</dt>
              <dd className="whitespace-pre-line break-words text-label">
                {q.resolution_source}
              </dd>
              <dt className="text-label-alt">예측 마감</dt>
              <dd className="text-label">{formatDate(q.close_at)}</dd>
              <dt className="text-label-alt">결과 확정</dt>
              <dd className="text-label">{formatDate(q.resolve_at)} 예정</dd>
            </dl>
          </header>

          {(issue?.context_lines.length || q.description) && (
            <section className="rounded-2xl bg-bg-alt p-5">
              {issue && issue.context_lines.length > 0 && (
                <>
                  <h2 className="t-label-1 !font-bold text-label">3줄 맥락</h2>
                  <ol className="mt-2 flex flex-col gap-1.5">
                    {issue.context_lines.map((line, i) => (
                      <li
                        key={i}
                        className="flex gap-2 t-body-3 text-label-neutral"
                      >
                        <span className="!font-extrabold text-accent-ink">
                          {i + 1}
                        </span>
                        {line}
                      </li>
                    ))}
                  </ol>
                  {issue.context_source_url && (
                    <a
                      href={issue.context_source_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-2 inline-block break-all t-caption-1 text-label-alt underline hover:text-label"
                    >
                      출처: {hostOf(issue.context_source_url)}
                    </a>
                  )}
                </>
              )}
              {q.description && (
                <p
                  className={`whitespace-pre-line t-body-3 text-label-neutral ${
                    issue?.context_lines.length
                      ? "mt-4 border-t border-line pt-4"
                      : ""
                  }`}
                >
                  {q.description}
                </p>
              )}
            </section>
          )}

          <div className="hidden flex-col gap-8 lg:flex">{insightsEl}</div>

          <section className="hidden lg:block">{discussionEl}</section>
        </article>

        {/* 사이드바(PC) / 본문 아래(모바일): 예측 패널, 같은 이슈의 다른 질문 */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {q.status === "resolved" && outcome && (
            <section
              className={`rounded-2xl p-4 text-center ${
                q.type === "ox" && q.outcome_index === 1
                  ? "bg-accent-red text-negative-strong"
                  : "bg-accent-blue text-primary"
              }`}
            >
              <p className="t-body-1 !font-bold">결과: {outcome}</p>
              {myScore !== undefined && (
                <p className="mt-0.5 t-label-1">
                  내 점수 {scoreText(myScore)}점
                  <span className="opacity-70"> · 기간 평균</span>
                </p>
              )}
              {myProbs &&
                (() => {
                  const keys = questionBadgeKeys(
                    stanceOf(myProbs, q.options).index === q.outcome_index,
                    board.participants,
                    board.hitRate,
                  );
                  return keys.length ? (
                    <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 t-label-2 text-label">
                      {keys.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1"
                        >
                          <BadgeIcon badgeKey={k} level={1} size={18} />
                          {badgeDef(k)?.name}
                        </span>
                      ))}
                      <span className="text-label-alt">조건을 채웠어요</span>
                    </p>
                  ) : null;
                })()}
            </section>
          )}
          {q.status === "void" && (
            <section className="rounded-2xl bg-fill p-4 text-center t-label-1 text-label-neutral">
              이 질문은 무효 처리되어 채점하지 않아요.
            </section>
          )}

          <section className={`${card} p-5`}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="t-body-1 !font-bold">내 예측</h2>
              {accepting && maxGain > 0 && (
                <span className="rounded-full border border-accent bg-accent-soft px-2.5 py-0.5 t-caption-1 !font-bold text-accent-ink">
                  지금 맞히면 최대 +{maxGain}점
                </span>
              )}
            </div>
            {!user ? (
              <Link href="/login" className={`${button.primary} w-full`}>
                로그인하고 예측하기
              </Link>
            ) : accepting ? (
              <>
                <PredictionForm
                  questionId={q.id}
                  type={q.type}
                  options={q.options}
                  myProbs={myProbs}
                  canWriteReason={!hasMyComment}
                />
                <p className="mt-4 border-t border-line-alt pt-3 t-caption-1 text-label-alt">
                  점수는 예측을 유지한 시간만큼 반영돼요. &lsquo;최대&rsquo;는
                  남은 기간을 가장 높은 확률로 맞혔을 때이고, 예측하기 전 기간은
                  그때의 집단 확률로 따로 계산해요.
                </p>
              </>
            ) : myProbs ? (
              <div>
                <Stance probs={myProbs} options={q.options} big />
                <p className="mt-4 flex items-center gap-1.5 t-caption-1 text-label-alt">
                  <LockIcon className="h-3.5 w-3.5" />
                  마감되어 더 이상 수정할 수 없어요.
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 t-label-1 text-label-alt">
                <LockIcon className="h-4 w-4" />
                마감되어 예측할 수 없어요.
              </p>
            )}
          </section>

          {siblings.length > 0 && (
            <section className={`${card} p-5`}>
              <h2 className="t-body-1 !font-bold">같은 이슈의 다른 질문</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <Link href={`/questions/${s.id}`} className="group block">
                      <p className="line-clamp-2 t-label-1 text-label group-hover:text-primary">
                        {s.title}
                      </p>
                      <p className="mt-0.5 t-caption-1 text-label-alt">
                        {statusLabel(s)} ·{" "}
                        {(boards.get(s.id) ?? EMPTY_BOARD).participants}명 예측
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* 모바일: 예측 패널 다음에 진영 대결·추이·토론 */}
        <div className="flex flex-col gap-8 lg:hidden">
          {insightsEl}
          {discussionEl}
        </div>
      </div>
    </PageShell>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Stance({
  probs,
  options,
  big = false,
}: {
  probs: number[];
  options: string[];
  big?: boolean;
}) {
  const s = stanceOf(probs, options);
  return big ? (
    <p className="t-title-1 text-primary">
      {s.label} <span className="tabular-nums">{s.pct}%</span>
    </p>
  ) : (
    <span className="whitespace-nowrap rounded-md bg-accent-blue px-1.5 py-0.5 t-caption-1 !font-semibold text-primary">
      {s.label} {s.pct}%
    </span>
  );
}

// 진영 대결: 선택지별 확률·오늘 변화량·대표 근거. 예측했거나 마감된 질문만 숫자를 보여준다.
function BattlePanel({
  q,
  board,
  accepting,
  topReasons,
}: {
  q: Question;
  board: Board;
  accepting: boolean;
  topReasons: (DiscussionComment | null)[];
}) {
  const crowd = board.crowd;
  const count =
    board.participants === 0
      ? "아직 예측 없음"
      : `${board.participants}명 예측`;
  const isOx = q.type === "ox";

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-baseline gap-2.5 t-heading-2">
          <span className="sec-idx">01</span>
          {accepting ? "진영 대결" : "최종 진영"}
        </h2>
        <p className="t-label-1 text-label-alt">{count}</p>
      </div>

      {!crowd ? (
        <div className="mt-3 rounded-2xl bg-bg-alt p-5">
          <p className="flex items-center gap-2 t-body-2 !font-semibold text-label-neutral">
            <LockIcon className="h-4 w-4" />
            {board.participants === 0
              ? "첫 예측을 남겨 보세요"
              : "예측하면 보여요"}
          </p>
          <p className="mt-1 t-caption-1 text-label-alt">
            다른 사람의 생각에 휩쓸리지 않도록, 내 예측을 먼저 남긴 뒤에
            확률·변화량·진영별 대표 근거를 공개해요.
          </p>
        </div>
      ) : (
        <ul
          className={`mt-3 grid gap-3 ${
            isOx ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {q.options.map((label, i) => {
            const pct = Math.round((crowd[i] ?? 0) * 100);
            const isAnswer = q.status === "resolved" && q.outcome_index === i;
            const reason = topReasons[i];
            const tone = isOx ? (i === 0 ? "positive" : "negative") : "primary";
            return (
              <li
                key={label}
                className={`rounded-2xl border p-4 ${
                  isAnswer ? "border-primary" : "border-line"
                } bg-surface`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-body-2 !font-bold text-label">
                    {label}
                    {isAnswer && (
                      <span className="ml-1.5 t-caption-1 text-primary">
                        정답
                      </span>
                    )}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <Change value={changeOf(board, i)} />
                    <span
                      className={`t-heading-1 tabular-nums ${
                        tone === "positive"
                          ? "text-positive"
                          : tone === "negative"
                            ? "text-negative"
                            : "text-primary"
                      }`}
                    >
                      {pct}%
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-strong">
                  <div
                    className={`h-full rounded-full ${
                      tone === "positive"
                        ? "bg-positive"
                        : tone === "negative"
                          ? "bg-negative"
                          : "bg-primary"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {reason && (
                  <p className="mt-3 line-clamp-2 t-label-2 text-label-neutral">
                    <TierMark tier={reason.tier} />{" "}
                    {reason.badge && (
                      <BadgeIcon
                        badgeKey={reason.badge.key}
                        level={reason.badge.level}
                        size={16}
                      />
                    )}{" "}
                    <span className="!font-semibold text-label">
                      {reason.nickname}
                    </span>{" "}
                    &ldquo;{reason.body}&rdquo;
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
