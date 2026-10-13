import Header from "@/components/Header";
import { getViewer } from "@/lib/auth";

const MIN_SCORED = 3;

type Row = {
  rank: number;
  user_id: string;
  nickname: string;
  total_score: number;
  scored_count: number;
};

function formatScore(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <Header />
      <h1 className="text-xl font-bold">랭킹</h1>
      <p className="mt-1 text-xs text-gray-500">
        판정된 예측이 {MIN_SCORED}건 이상인 사람만 누적 점수 순으로 보여요.
      </p>

      {user && !me && myCount !== null && (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          내 판정된 예측 <strong>{myCount}</strong>/{MIN_SCORED}건 —{" "}
          {MIN_SCORED - myCount > 0
            ? `${MIN_SCORED - myCount}건 더 판정되면 랭킹에 올라요.`
            : "곧 랭킹에 반영돼요."}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">
          아직 랭킹에 오른 사람이 없어요.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-gray-100">
          {rows.map((r) => {
            const isMe = r.user_id === user?.id;
            return (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 px-2 py-3 ${
                  isMe ? "rounded-xl bg-indigo-50" : ""
                }`}
              >
                <span
                  className={`w-8 shrink-0 text-center font-bold tabular-nums ${
                    r.rank <= 3 ? "text-orange-500" : "text-gray-400"
                  }`}
                >
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.nickname}
                    {isMe && (
                      <span className="ml-1 text-xs text-indigo-600">(나)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    판정된 예측 {r.scored_count}건
                  </p>
                </div>
                <span
                  className={`shrink-0 text-lg font-bold tabular-nums ${
                    r.total_score < 0 ? "text-red-600" : ""
                  }`}
                >
                  {formatScore(r.total_score)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
