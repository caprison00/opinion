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

  const tabs = [{ value: null, label: "전체" }, ...CATEGORIES];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Header />

      {!user && (
        <Link
          href="/login"
          className="mb-4 block rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white"
        >
          로그인하고 예측에 참여하기
        </Link>
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
          questions.map((q) => <QuestionCard key={q.id} question={q} />)
        )}
      </section>
    </main>
  );
}
