import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getViewer } from "@/lib/auth";
import { formatDate, statusLabel, type Question } from "@/lib/questions";

type MyPrediction = {
  id: string;
  probability: number;
  reason: string;
  questions: Question;
};

export default async function MyPredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "done" ? "done" : "active";

  const { supabase, user } = await getViewer();
  if (!user) redirect("/login");

  const [{ data: predictionData }, { data: scoreData }] = await Promise.all([
    supabase
      .from("predictions")
      .select("id, probability, reason, questions(*)")
      .eq("user_id", user.id),
    supabase
      .from("prediction_scores")
      .select("prediction_id, score")
      .eq("user_id", user.id),
  ]);

  const predictions = (predictionData ?? []) as unknown as MyPrediction[];
  const scores = new Map(
    ((scoreData ?? []) as { prediction_id: string; score: number }[]).map(
      (s) => [s.prediction_id, s.score],
    ),
  );
  const totalScore = [...scores.values()].reduce((a, b) => a + b, 0);

  const isDone = (p: MyPrediction) =>
    p.questions.status === "resolved" || p.questions.status === "void";
  const active = predictions
    .filter((p) => !isDone(p))
    .sort((a, b) => a.questions.close_at.localeCompare(b.questions.close_at));
  const done = predictions
    .filter(isDone)
    .sort((a, b) =>
      b.questions.resolve_at.localeCompare(a.questions.resolve_at),
    );
  const list = tab === "done" ? done : active;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Header />
      <h1 className="text-xl font-bold">내 예측</h1>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-900 p-4 text-white">
          <p className="text-xs text-gray-300">누적 점수</p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
              totalScore < 0 ? "text-red-300" : ""
            }`}
          >
            {totalScore > 0 ? `+${totalScore}` : totalScore}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500">채점된 예측</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{scores.size}</p>
        </div>
      </section>

      <nav className="mt-6 flex gap-2">
        {[
          { value: "active", label: `진행 중 ${active.length}` },
          { value: "done", label: `판정 완료 ${done.length}` },
        ].map((t) => (
          <Link
            key={t.value}
            href={t.value === "done" ? "/me?tab=done" : "/me"}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === t.value
                ? "bg-gray-900 font-medium text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <ul className="mt-3 flex flex-col gap-3">
        {list.length === 0 && (
          <li className="py-16 text-center text-sm text-gray-400">
            {tab === "done"
              ? "아직 판정된 예측이 없어요."
              : "진행 중인 예측이 없어요."}
          </li>
        )}
        {list.map((p) => {
          const q = p.questions;
          const score = scores.get(p.id);
          return (
            <li key={p.id}>
              <Link
                href={`/questions/${q.id}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4 active:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">
                    {statusLabel(q)} ·{" "}
                    {tab === "done"
                      ? `확정 ${formatDate(q.resolve_at)}`
                      : `마감 ${formatDate(q.close_at)}`}
                  </p>
                  <p className="mt-0.5 font-medium leading-snug">{q.title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    내 예측 <strong>{p.probability}%</strong>
                  </p>
                </div>
                {tab === "done" && (
                  <ScoreBadge score={score} isVoid={q.status === "void"} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function ScoreBadge({ score, isVoid }: { score?: number; isVoid: boolean }) {
  if (isVoid || score === undefined) {
    return <span className="shrink-0 text-sm text-gray-400">채점 제외</span>;
  }
  return (
    <span
      className={`shrink-0 text-xl font-bold tabular-nums ${
        score > 0
          ? "text-blue-600"
          : score < 0
            ? "text-red-600"
            : "text-gray-500"
      }`}
    >
      {score > 0 ? `+${score}` : score}
    </span>
  );
}
