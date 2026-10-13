import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
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
  const mine = user ? predictions.find((p) => p.user_id === user.id) : undefined;
  const reasons = predictions.filter((p) => p.reason);
  const accepting = isAccepting(q);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Header />
      <Link href="/" className="text-sm text-gray-500">
        ← 목록으로
      </Link>

      <article className="mt-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
            {categoryLabel(q.category)}
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-600">
            {statusLabel(q)}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug">{q.title}</h1>

        {q.description && (
          <p className="mt-3 whitespace-pre-line text-gray-700">
            {q.description}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          <dt className="text-gray-500">예측 마감</dt>
          <dd>
            {formatDate(q.close_at)}{" "}
            <span className="text-orange-600">({timeLeft(q.close_at)})</span>
          </dd>
          <dt className="text-gray-500">결과 확정</dt>
          <dd>{formatDate(q.resolve_at)} 예정</dd>
          <dt className="text-gray-500">판정 출처</dt>
          <dd className="whitespace-pre-line break-words">
            {q.resolution_source}
          </dd>
        </dl>

        <section className="mt-5 rounded-2xl bg-gray-900 p-5 text-center text-white">
          <p className="text-sm text-gray-300">현재 집단 확률</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {crowd === null ? "–" : `${crowd}%`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {predictions.length === 0
              ? "아직 예측한 사람이 없어요"
              : `${predictions.length}명 예측`}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 p-5">
          <h2 className="mb-4 font-bold">내 예측</h2>
          {!user ? (
            <Link
              href="/login"
              className="block rounded-xl bg-gray-900 px-4 py-3 text-center font-medium text-white"
            >
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
              <p className="text-3xl font-bold tabular-nums">
                {mine.probability}%
              </p>
              {mine.reason && (
                <p className="mt-1 text-sm text-gray-600">“{mine.reason}”</p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                🔒 마감되어 더 이상 수정할 수 없어요.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              🔒 마감되어 예측할 수 없어요.
            </p>
          )}
        </section>

        <section className="mt-5">
          <h2 className="font-bold">
            다른 사람들의 근거{" "}
            <span className="text-sm font-normal text-gray-400">
              {reasons.length}
            </span>
          </h2>
          {reasons.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              아직 근거가 없어요.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {reasons.map((p) => (
                <li key={p.user_id} className="flex gap-3 py-3">
                  <span className="w-12 shrink-0 text-right font-bold tabular-nums">
                    {p.probability}%
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      {p.profiles?.nickname ?? "알 수 없음"}
                      {user && p.user_id === user.id && " (나)"}
                    </p>
                    <p className="break-words text-sm">{p.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}
