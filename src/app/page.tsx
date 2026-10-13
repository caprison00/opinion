import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import QuestionCard from "@/components/QuestionCard";
import { chip } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { CATEGORIES, isCategory, type Question } from "@/lib/questions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; deleted?: string }>;
}) {
  const { category: rawCategory, deleted } = await searchParams;
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
    <PageShell>
      {deleted && !user && (
        <p className="mb-6 rounded-xl bg-bg-alt px-4 py-3 t-label-1 text-label-neutral">
          탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}
      {!user && (
        <section className="relative mb-8 overflow-hidden rounded-[20px] bg-gradient-to-br from-primary to-primary-deep px-6 py-8 text-white md:mb-12 md:px-12 md:py-14">
          <p className="t-caption-1 !font-semibold tracking-[0.14em] text-white/70">
            예측 게임
          </p>
          <h1 className="mt-2 t-heading-1 md:t-title-1">
            미래를 확률로 맞혀 보세요
          </h1>
          <p className="mt-2 t-body-3 text-white/80 md:t-body-1">
            돈은 걸지 않아요. 예측이 맞을수록 점수가 쌓이고, 랭킹에 올라요.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-5 t-label-1 !font-semibold text-primary transition-colors hover:bg-white/90"
          >
            로그인하고 시작하기
          </Link>
        </section>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="t-heading-1 md:t-title-3">진행 중인 질문</h1>
          <p className="mt-1 t-label-1 text-label-alt">
            마감이 가까운 순서로 보여요.
          </p>
        </div>
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/?category=${tab.value}` : "/"}
              className={chip(tab.value === category)}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="mt-6">
        {questions.length === 0 ? (
          <EmptyState message="진행 중인 질문이 없어요." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                crowd={stats.get(q.id)?.crowd_probability}
                count={stats.get(q.id)?.prediction_count}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
