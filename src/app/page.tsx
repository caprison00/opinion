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

  // 진행 중인 질문을 한 번에 가져와 카테고리별 개수와 목록을 함께 만든다.
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("status", "open")
    .gt("close_at", new Date().toISOString())
    .order("close_at", { ascending: true });
  const all = (data ?? []) as Question[];
  const questions = category ? all.filter((q) => q.category === category) : all;

  const counts = new Map<string, number>();
  for (const q of all)
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  // 질문이 없어도 모든 카테고리를 탭으로 보여준다.
  const tabs = [
    { value: null, label: "전체", count: all.length },
    ...CATEGORIES.map((c) => ({ ...c, count: counts.get(c.value) ?? 0 })),
  ];
  const currentLabel = category
    ? CATEGORIES.find((c) => c.value === category)?.label
    : null;

  // 참여자 수는 모두, 집단 확률은 내가 예측한 질문만 돌아온다 (DB 함수).
  const { data: summaryData } = questions.length
    ? await supabase.rpc("question_summary", {
        p_ids: questions.map((q) => q.id),
      })
    : { data: [] };
  const summaries = new Map(
    (
      (summaryData ?? []) as {
        question_id: string;
        participants: number;
        crowd: number[] | null;
      }[]
    ).map((s) => [s.question_id, s]),
  );

  return (
    <PageShell>
      {deleted && !user && (
        <p className="mb-6 rounded-xl bg-bg-alt px-4 py-3 t-label-1 text-label-neutral">
          탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.
        </p>
      )}
      {!user && (
        <section className="relative mb-8 overflow-hidden rounded-[20px] bg-gradient-to-br from-brand to-primary-deep px-6 py-8 text-white md:mb-12 md:px-12 md:py-14">
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
            className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-5 t-label-1 !font-semibold text-brand transition-colors hover:bg-white/90"
          >
            로그인하고 시작하기
          </Link>
        </section>
      )}

      <div>
        <h1 className="t-heading-1 md:t-title-3">
          {currentLabel ? `${currentLabel} 질문` : "진행 중인 질문"}
        </h1>
        <p className="mt-1 t-label-1 text-label-alt">
          마감이 가까운 순서로 보여요.
        </p>
      </div>

      {/* 카테고리 바: 스크롤해도 상단 메뉴 아래에 붙어 있다 */}
      <nav
        aria-label="카테고리"
        className="sticky top-[52px] z-10 -mx-4 mt-4 border-b border-line bg-bg/95 backdrop-blur-md md:top-16 md:-mx-6"
      >
        <div className="scroll-row flex gap-2 overflow-x-auto px-4 py-3 md:px-6">
          {tabs.map((tab) => {
            const active = tab.value === category;
            return (
              <Link
                key={tab.label}
                href={tab.value ? `/?category=${tab.value}` : "/"}
                aria-current={active ? "page" : undefined}
                className={`${chip(active)} shrink-0 gap-1.5`}
              >
                {tab.label}
                <span
                  className={`t-caption-1 tabular-nums ${
                    active ? "text-on-inverse/60" : "text-label-assist"
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <section className="mt-5">
        {questions.length === 0 ? (
          <EmptyState
            message={
              currentLabel
                ? `${currentLabel} 카테고리에 진행 중인 질문이 없어요.`
                : "진행 중인 질문이 없어요."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                crowd={summaries.get(q.id)?.crowd?.map(Number) ?? null}
                count={summaries.get(q.id)?.participants ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
