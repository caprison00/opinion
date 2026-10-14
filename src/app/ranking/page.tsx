import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import { card, scoreColor, scoreText } from "@/components/ui";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "랭킹" };

const MIN_SCORED = 3;

type Row = {
  rank: number;
  user_id: string;
  nickname: string;
  total_score: number;
  scored_count: number;
};

export default async function RankingPage() {
  const { supabase, user } = await getViewer();

  const [{ data }, myCount] = await Promise.all([
    supabase
      .from("leaderboard")
      .select("*")
      .order("rank", { ascending: true })
      .order("scored_count", { ascending: false })
      .limit(100),
    user
      ? supabase
          .from("prediction_scores")
          .select("prediction_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then((r) => r.count ?? 0)
      : Promise.resolve(null),
  ]);
  const rows = (data ?? []) as Row[];
  const me = user ? rows.find((r) => r.user_id === user.id) : undefined;

  return (
    <PageShell narrow>
      <h1 className="t-heading-1 md:t-title-3">랭킹</h1>
      <p className="mt-1 t-label-1 text-label-alt">
        판정된 예측이 {MIN_SCORED}건 이상인 사람만 누적 점수 순으로 보여요.
      </p>

      {user && !me && myCount !== null && (
        <p className="mt-5 rounded-xl bg-accent-blue px-4 py-3 t-label-1 text-primary">
          내 판정된 예측 <strong>{myCount}</strong>/{MIN_SCORED}건 ·{" "}
          {MIN_SCORED - myCount > 0
            ? `${MIN_SCORED - myCount}건 더 판정되면 랭킹에 올라요.`
            : "곧 랭킹에 반영돼요."}
        </p>
      )}

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState message="아직 랭킹에 오른 사람이 없어요." />
        ) : (
          <ol className={`${card} divide-y divide-line-alt overflow-hidden`}>
            {rows.map((r) => {
              const isMe = r.user_id === user?.id;
              return (
                <li
                  key={r.user_id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    isMe ? "bg-accent-blue" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full t-label-1 !font-bold tabular-nums ${
                      r.rank <= 3
                        ? "bg-brand text-white"
                        : "bg-fill text-label-alt"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-body-2 !font-semibold">
                      {r.nickname}
                      {isMe && (
                        <span className="ml-1 t-label-2 text-primary">
                          (나)
                        </span>
                      )}
                    </p>
                    <p className="t-caption-1 text-label-alt">
                      판정된 예측 {r.scored_count}건
                    </p>
                  </div>
                  <span
                    className={`shrink-0 t-heading-2 tabular-nums ${scoreColor(r.total_score)}`}
                  >
                    {scoreText(r.total_score)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </PageShell>
  );
}
