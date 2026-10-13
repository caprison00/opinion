import Link from "next/link";
import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { ChevronRightIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { card, chip, scoreColor, scoreText } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { formatDate, statusLabel, type Question } from "@/lib/questions";
import DeleteAccount from "./DeleteAccount";

export const metadata = { title: "내 예측" };

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

  const [{ data: predictionData }, { data: scoreData }, { data: profile }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("id, probability, reason, questions(*)")
        .eq("user_id", user.id),
      supabase
        .from("prediction_scores")
        .select("prediction_id, score")
        .eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle(),
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
    <PageShell narrow>
      <div className="flex items-end justify-between">
        <div>
          <p className="t-label-1 text-label-alt">{profile?.nickname}</p>
          <h1 className="t-heading-1 md:t-title-3">내 예측</h1>
        </div>
        <Link
          href="/onboarding"
          className="t-label-1 text-label-alt hover:text-label"
        >
          닉네임 변경
        </Link>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 md:gap-4">
        <div className="rounded-[20px] bg-gradient-to-br from-primary to-primary-deep p-5 text-white">
          <p className="t-label-2 text-white/75">누적 점수</p>
          <p className="mt-1 t-title-1 tabular-nums">{scoreText(totalScore)}</p>
        </div>
        <div className="rounded-[20px] bg-bg-alt p-5">
          <p className="t-label-2 text-label-alt">채점된 예측</p>
          <p className="mt-1 t-title-1 tabular-nums">{scores.size}</p>
        </div>
      </section>

      <nav className="mt-8 flex gap-2">
        {[
          { value: "active", label: `진행 중 ${active.length}` },
          { value: "done", label: `판정 완료 ${done.length}` },
        ].map((t) => (
          <Link
            key={t.value}
            href={t.value === "done" ? "/me?tab=done" : "/me"}
            className={chip(tab === t.value)}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState
            message={
              tab === "done"
                ? "아직 판정된 예측이 없어요."
                : "진행 중인 예측이 없어요."
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((p) => {
              const q = p.questions;
              const score = scores.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/questions/${q.id}`}
                    className={`${card} flex items-center gap-4 p-5 transition-shadow hover:shadow-small`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="t-caption-1 text-label-alt">
                        {statusLabel(q)} ·{" "}
                        {tab === "done"
                          ? `확정 ${formatDate(q.resolve_at)}`
                          : `마감 ${formatDate(q.close_at)}`}
                      </p>
                      <p className="mt-1 line-clamp-2 t-body-2 !font-bold">
                        {q.title}
                      </p>
                      <p className="mt-1 t-label-1 text-label-neutral">
                        내 예측{" "}
                        <span className="!font-semibold text-primary">
                          {p.probability}%
                        </span>
                      </p>
                    </div>
                    {tab === "done" ? (
                      q.status === "void" || score === undefined ? (
                        <span className="shrink-0 t-label-1 text-label-assist">
                          채점 제외
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 t-heading-2 tabular-nums ${scoreColor(score)}`}
                        >
                          {scoreText(score)}
                        </span>
                      )
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 shrink-0 text-label-assist" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <section className="mt-16 border-t border-line pt-6">
        <DeleteAccount />
      </section>
    </PageShell>
  );
}
