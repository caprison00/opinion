import Link from "next/link";
import Header from "@/components/Header";
import QuestionCard from "@/components/QuestionCard";
import { getViewer } from "@/lib/auth";
import { CATEGORIES, isCategory, type Question } from "@/lib/questions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const category = isCategory(rawCategory) ? rawCategory : null;

  const { supabase, user } = await getViewer();

  let query = supabase
    .from("questions")
    .select("*")
    .eq("status", "open")
    .gt("close_at", new Date().toISOString())
    .order("close_at", { ascending: true });
  if (category) query = query.eq("category", category);

  const { data } = await query;
  const questions = (data ?? []) as Question[];

  const { data: statsData } = questions.length
    ? await supabase
        .from("question_stats")
        .select("question_id, crowd_probability, prediction_count")
        .in(
          "question_id",
          questions.map((q) => q.id),
        )
    : { data: [] };
  const stats = new Map(
    (
      (statsData ?? []) as {
        question_id: string;
        crowd_probability: number;
        prediction_count: number;
      }[]
    ).map((s) => [s.question_id, s]),
  );

  const tabs = [{ value: null, label: "전체" }, ...CATEGORIES];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      <Header />

      {!user && (
        <section className="mb-5 rounded-2xl bg-indigo-50 p-5">
          <p className="font-bold text-indigo-900">미래를 확률로 맞혀 보세요</p>
          <p className="mt-1 text-sm text-indigo-800/80">
            돈은 걸지 않아요. 예측이 맞을수록 점수가 쌓이고, 랭킹에 올라요.
          </p>
          <Link
            href="/login"
            className="mt-4 block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white"
          >
            로그인하고 시작하기
          </Link>
        </section>
      )}

      <nav className="flex gap-2">
        {tabs.map((tab) => {
          const active = tab.value === category;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/?category=${tab.value}` : "/"}
              className={`rounded-full px-4 py-1.5 text-sm ${
                active
                  ? "bg-gray-900 font-medium text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-4 flex flex-col gap-3">
        {questions.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            진행 중인 질문이 없어요.
          </p>
        ) : (
          questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              crowd={stats.get(q.id)?.crowd_probability}
              count={stats.get(q.id)?.prediction_count}
            />
          ))
        )}
      </section>
    </main>
  );
}
