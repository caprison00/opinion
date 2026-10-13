import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, LockIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { button, card, scoreText } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  statusLabel,
  timeLeft,
  type Question,
} from "@/lib/questions";
import PredictionForm from "./PredictionForm";

type PredictionRow = {
  user_id: string;
  probability: number;
  reason: string;
  updated_at: string;
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
    { data: predictionData },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("predictions")
      .select("user_id, probability, reason, updated_at, profiles(nickname)")
      .eq("question_id", id)
      .order("updated_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const q = data as Question;
  const predictions = (predictionData ?? []) as unknown as PredictionRow[];

  const crowd =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((sum, p) => sum + p.probability, 0) /
            predictions.length,
        )
      : null;
  const mine = user
    ? predictions.find((p) => p.user_id === user.id)
    : undefined;
  const reasons = predictions.filter((p) => p.reason);
  const accepting = isAccepting(q);

  let myScore: number | undefined;
  if (mine && q.status === "resolved") {
    const { data: scoreRow } = await supabase
      .from("prediction_scores")
      .select("score")
      .eq("question_id", q.id)
      .eq("user_id", mine.user_id)
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
            <Reasons reasons={reasons} userId={user?.id} />
          </section>
        </article>

        {/* 오른쪽(데스크톱) / 아래(모바일): 집단 확률과 내 예측 */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {q.status === "resolved" && q.outcome && (
            <section
              className={`rounded-2xl p-4 text-center ${
                q.outcome === "yes"
                  ? "bg-accent-blue text-primary"
                  : "bg-accent-red text-negative-strong"
              }`}
            >
              <p className="t-body-1 !font-bold">
                결과 {q.outcome.toUpperCase()}
              </p>
              {myScore !== undefined && (
                <p className="mt-0.5 t-label-1">
                  내 점수 {scoreText(myScore)}점
                </p>
              )}
            </section>
          )}
          {q.status === "void" && (
            <section className="rounded-2xl bg-fill p-4 text-center t-label-1 text-label-neutral">
              이 질문은 무효 처리되어 채점하지 않아요.
            </section>
          )}

          <section className="rounded-[20px] bg-gradient-to-br from-primary to-primary-deep p-6 text-white">
            <p className="t-label-1 text-white/75">
              {accepting ? "현재 집단 확률" : "최종 집단 확률"}
            </p>
            <div className="mt-1 flex items-end justify-between">
              <p className="t-display-2 tabular-nums">
                {crowd === null ? "–" : `${crowd}%`}
              </p>
              <p className="pb-2 t-label-2 text-white/70">
                {predictions.length === 0
                  ? "예측 없음"
                  : `${predictions.length}명 예측`}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${crowd ?? 0}%` }}
              />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-4 t-body-1 !font-bold">내 예측</h2>
            {!user ? (
              <Link href="/login" className={`${button.primary} w-full`}>
                로그인하고 예측하기
              </Link>
            ) : accepting ? (
              <PredictionForm
                questionId={q.id}
                initialProbability={mine?.probability}
                initialReason={mine?.reason}
              />
            ) : mine ? (
              <div>
                <p className="t-title-1 tabular-nums text-primary">
                  {mine.probability}%
                </p>
                {mine.reason && (
                  <p className="mt-1 t-body-3 text-label-neutral">
                    “{mine.reason}”
                  </p>
                )}
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
          <Reasons reasons={reasons} userId={user?.id} />
        </section>
      </div>
    </PageShell>
  );
}

function Reasons({
  reasons,
  userId,
}: {
  reasons: PredictionRow[];
  userId?: string;
}) {
  return (
    <>
      <h2 className="t-heading-2">
        다른 사람들의 근거{" "}
        <span className="t-body-2 text-label-assist">{reasons.length}</span>
      </h2>
      {reasons.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-bg-alt py-10 text-center t-label-1 text-label-alt">
          아직 근거가 없어요.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line-alt">
          {reasons.map((p) => (
            <li key={p.user_id} className="flex gap-4 py-4">
              <span className="w-12 shrink-0 text-right t-body-1 !font-bold tabular-nums text-primary">
                {p.probability}%
              </span>
              <div className="min-w-0">
                <p className="t-caption-1 text-label-alt">
                  {p.profiles?.nickname ?? "알 수 없음"}
                  {userId && p.user_id === userId && " (나)"}
                </p>
                <p className="mt-0.5 break-words t-body-3 text-label">
                  {p.reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
