import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, LockIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { button, card, scoreText } from "@/components/ui";
import type { ReactionKind } from "@/lib/discussion";
import { createClient } from "@/lib/supabase/server";
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

type CommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  profiles: { nickname: string } | null;
};

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
    { data: summaryData },
    { data: commentData },
    { data: predictionData },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("question_summary", { p_ids: [id] }),
    supabase
      .from("comments")
      .select("id, user_id, parent_id, body, created_at, profiles(nickname)")
      .eq("question_id", id)
      .order("created_at", { ascending: false }),
    // 여론 공개 규칙(DB): 내가 예측했거나 마감된 질문이면 모두, 아니면 내 예측만 돌아온다.
    supabase.from("predictions").select("user_id, probs").eq("question_id", id),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const q = data as Question;

  const summary = (
    (summaryData ?? []) as { participants: number; crowd: number[] | null }[]
  )[0];
  const participants = summary?.participants ?? 0;
  const crowd = summary?.crowd?.map(Number) ?? null;

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
  const [{ data: reactionData }, { data: authorScoreData }] = await Promise.all(
    [
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
    ],
  );
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

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        목록으로
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        {/* 왼쪽: 질문 내용과 근거 목록 */}
        <article className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-fill px-2 py-0.5 t-caption-1 !font-semibold text-label-neutral">
              {categoryLabel(q.category)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 t-caption-1 !font-semibold ${
                accepting
                  ? "bg-accent-blue text-primary"
                  : "bg-fill text-label-alt"
              }`}
            >
              {statusLabel(q)}
            </span>
          </div>
          <h1 className="mt-3 t-heading-1 md:t-title-2">{q.title}</h1>

          {q.description && (
            <p className="mt-4 whitespace-pre-line t-body-2 text-label-neutral">
              {q.description}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-2xl bg-bg-alt p-5 t-label-1">
            <dt className="text-label-alt">예측 마감</dt>
            <dd className="text-label">
              {formatDate(q.close_at)}
              {accepting && (
                <span className="ml-1.5 !font-semibold text-caution-text">
                  {timeLeft(q.close_at)}
                </span>
              )}
            </dd>
            <dt className="text-label-alt">결과 확정</dt>
            <dd className="text-label">{formatDate(q.resolve_at)} 예정</dd>
            <dt className="text-label-alt">판정 출처</dt>
            <dd className="whitespace-pre-line break-words text-label">
              {q.resolution_source}
            </dd>
          </dl>

          <section className="mt-10 hidden lg:block">
            <Discussion
              questionId={q.id}
              comments={discussion}
              options={q.options}
              outcomeIndex={q.status === "resolved" ? q.outcome_index : null}
              viewerId={user?.id ?? null}
              locked={!myProbs && accepting}
            />
          </section>
        </article>

        {/* 오른쪽(데스크톱) / 아래(모바일): 집단 확률과 내 예측 */}
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
            </section>
          )}
          {q.status === "void" && (
            <section className="rounded-2xl bg-fill p-4 text-center t-label-1 text-label-neutral">
              이 질문은 무효 처리되어 채점하지 않아요.
            </section>
          )}

          <CrowdPanel
            q={q}
            crowd={crowd}
            participants={participants}
            accepting={accepting}
          />

          <section className={`${card} p-5`}>
            <h2 className="mb-4 t-body-1 !font-bold">내 예측</h2>
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
                  점수는 예측을 유지한 시간만큼 반영돼요. 일찍 맞힐수록 높고,
                  예측하기 전 기간은 그때의 집단 확률로 계산해요.
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
        </aside>

        <section className="lg:hidden">
          <Discussion
            questionId={q.id}
            comments={discussion}
            options={q.options}
            outcomeIndex={q.status === "resolved" ? q.outcome_index : null}
            viewerId={user?.id ?? null}
            locked={!myProbs && accepting}
          />
        </section>
      </div>
    </PageShell>
  );
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

// 집단 확률: 예측했거나 마감된 질문만 숫자를 보여주고, 아니면 가린다.
function CrowdPanel({
  q,
  crowd,
  participants,
  accepting,
}: {
  q: Question;
  crowd: number[] | null;
  participants: number;
  accepting: boolean;
}) {
  const title = accepting ? "현재 집단 확률" : "최종 집단 확률";
  const count = participants === 0 ? "예측 없음" : `${participants}명 예측`;

  if (!crowd) {
    return (
      <section className="rounded-[20px] bg-bg-alt p-6">
        <div className="flex items-baseline justify-between">
          <p className="t-label-1 text-label-alt">{title}</p>
          <p className="t-label-2 text-label-alt">{count}</p>
        </div>
        <p className="mt-3 flex items-center gap-2 t-body-2 !font-semibold text-label-neutral">
          <LockIcon className="h-4 w-4" />
          {participants === 0 ? "첫 예측을 남겨 보세요" : "예측하면 보여요"}
        </p>
        <p className="mt-1 t-caption-1 text-label-alt">
          다른 사람의 생각에 휩쓸리지 않도록, 내 예측을 먼저 남긴 뒤에 공개해요.
        </p>
      </section>
    );
  }

  if (q.type === "ox") {
    const yes = Math.round(crowd[0] * 100);
    return (
      <section className="rounded-[20px] bg-gradient-to-br from-brand to-primary-deep p-6 text-white">
        <p className="t-label-1 text-white/75">{title}</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="t-display-2 tabular-nums">
            {q.options[0]} {yes}%
          </p>
          <p className="pb-2 t-label-2 text-white/70">{count}</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${yes}%` }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] bg-gradient-to-br from-brand to-primary-deep p-6 text-white">
      <div className="flex items-baseline justify-between">
        <p className="t-label-1 text-white/75">{title}</p>
        <p className="t-label-2 text-white/70">{count}</p>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {q.options.map((label, i) => {
          const pct = Math.round((crowd[i] ?? 0) * 100);
          const isAnswer = q.outcome_index === i;
          return (
            <li key={label}>
              <div className="flex items-baseline justify-between t-body-3">
                <span className={isAnswer ? "!font-bold" : "text-white/85"}>
                  {label}
                  {isAnswer && " · 정답"}
                </span>
                <span className="!font-bold tabular-nums">{pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
