import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { AlertIcon } from "@/components/icons";
import { button, card, chip, input } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import type { Issue } from "@/lib/board";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  statusLabel,
  type Question,
} from "@/lib/questions";
import { setQuestionIssue } from "./actions";
import PrivateActions from "./PrivateActions";
import DeleteIssueButton from "./DeleteIssueButton";
import IssueForm from "./IssueForm";
import QuestionActions from "./QuestionActions";
import QuestionForm from "./QuestionForm";

export const metadata = { title: "관리자" };

type Tab = "questions" | "private" | "new" | "issues";
type Filter = "all" | "open" | "pending" | "done";

const TABS: { value: Tab; label: string }[] = [
  { value: "questions", label: "질문 관리" },
  { value: "private", label: "비공개 질문" },
  { value: "new", label: "새 질문" },
  { value: "issues", label: "이슈 묶음" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.value === params.tab)
    ? (params.tab as Tab)
    : "questions";
  const filter: Filter = ["open", "pending", "done"].includes(
    params.filter ?? "",
  )
    ? (params.filter as Filter)
    : "all";

  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");

  if (!isAdmin) {
    return (
      <PageShell narrow>
        <p className="rounded-2xl bg-bg-alt py-16 text-center t-body-2 text-label-alt">
          관리자만 볼 수 있는 화면이에요.
        </p>
      </PageShell>
    );
  }

  const [{ data }, { data: issueData }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const all = (data ?? []) as Question[];
  // 공개된 질문만 '질문 관리'에, 비공개는 '비공개 질문'에
  const questions = all.filter((q) => q.is_public !== false);
  const privates = all.filter((q) => q.is_public === false);
  const issues = (issueData ?? []) as Issue[];
  const issueCount = new Map<string, number>();
  for (const q of all) {
    if (q.issue_id)
      issueCount.set(q.issue_id, (issueCount.get(q.issue_id) ?? 0) + 1);
  }

  // 질문 상태 분류: 진행 중 / 판정 대기(마감됐고 아직 판정 전) / 완료(판정·무효)
  const now = Date.now();
  const groupOf = (q: Question): Exclude<Filter, "all"> =>
    q.status === "resolved" || q.status === "void"
      ? "done"
      : isAccepting(q)
        ? "open"
        : "pending";
  const overdue = (q: Question) =>
    groupOf(q) !== "done" && new Date(q.resolve_at).getTime() < now;
  const counts = { all: questions.length, open: 0, pending: 0, done: 0 };
  for (const q of questions) counts[groupOf(q)]++;
  const overdueCount = questions.filter(overdue).length;

  const list = questions
    .filter((q) => filter === "all" || groupOf(q) === filter)
    // 판정 대기는 확정 예정일이 이른 순서로
    .sort((a, b) =>
      filter === "pending" ? a.resolve_at.localeCompare(b.resolve_at) : 0,
    );

  // 운영 규칙: 48시간 안에 판정되는 진행 중(또는 마감) 질문이 항상 1개 이상 있어야 한다.
  const soon = now + 48 * 3_600_000;
  const resolvingSoon = questions.filter(
    (q) =>
      (q.status === "open" || q.status === "closed") &&
      new Date(q.resolve_at).getTime() <= soon,
  ).length;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-heading-1 md:t-title-3">관리자</h1>
        <div className="flex gap-2">
          <Link href="/admin/stats" className={button.smallSecondary}>
            통계
          </Link>
          <Link href="/admin/reports" className={button.smallSecondary}>
            신고
          </Link>
          <Link href="/admin/feedback" className={button.smallSecondary}>
            의견
          </Link>
          <Link href="/admin/legal" className={button.smallSecondary}>
            약관 관리
          </Link>
        </div>
      </div>

      {/* 운영 경고 */}
      <div className="mt-5 flex flex-col gap-2">
        {resolvingSoon === 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-accent-orange px-4 py-3 t-label-1 text-caution-text">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            48시간 안에 판정되는 질문이 없어요. 결과 확정이 가까운 질문을 하나
            이상 만들어 주세요.
          </p>
        )}
        {overdueCount > 0 && (
          <Link
            href="/admin?filter=pending"
            className="flex items-start gap-2 rounded-xl bg-accent-red px-4 py-3 t-label-1 text-negative-strong"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            결과 확정 예정일이 지났는데 판정하지 않은 질문이 {overdueCount}개
            있어요.
          </Link>
        )}
      </div>

      <nav
        aria-label="관리 메뉴"
        className="mt-5 flex gap-1 border-b border-line"
      >
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "questions" ? "/admin" : `/admin?tab=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 t-body-3 !font-semibold transition-colors ${
              tab === t.value
                ? "border-label text-label"
                : "border-transparent text-label-alt hover:text-label"
            }`}
          >
            {t.label}
            {t.value === "private" && privates.length > 0 && (
              <span className="ml-1 rounded-full bg-accent-orange px-1.5 t-caption-1 !font-bold text-caution-text">
                {privates.length}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "new" && (
        <section className={`${card} mt-6 max-w-[640px] p-5 md:p-6`}>
          <h2 className="t-heading-2">새 질문 만들기</h2>
          <p className="mb-5 mt-1 t-label-1 text-label-alt">
            새 질문은 비공개로 저장돼요. &lsquo;비공개 질문&rsquo;에서
            확인·수정한 뒤 공개하면 그때부터 예측을 받아요.
          </p>
          <QuestionForm issues={issues} />
        </section>
      )}

      {tab === "private" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="t-label-1 text-label-alt">
              사용자에게 보이지 않는 질문이에요. 공개하면 이 목록에서 사라지고
              &lsquo;질문 관리&rsquo;로 옮겨져요.
            </p>
            <Link href="/admin?tab=new" className={button.smallPrimary}>
              새 질문
            </Link>
          </div>
          {privates.length === 0 ? (
            <p className="mt-4 rounded-xl bg-bg-alt py-10 text-center t-label-1 text-label-alt">
              비공개 질문이 없어요.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-alt">
              {privates.map((q) => {
                const expired = new Date(q.close_at).getTime() <= now;
                return (
                  <li key={q.id} className="py-4">
                    <p className="flex flex-wrap items-center gap-x-1.5 t-caption-1 text-label-alt">
                      {expired && (
                        <span className="rounded bg-accent-red px-1.5 py-0.5 !font-semibold text-negative-strong">
                          마감일 지남 · 수정 필요
                        </span>
                      )}
                      <span>
                        {categoryLabel(q.category)}
                        {q.type === "choice" &&
                          ` · 객관식 ${q.options.length}`}{" "}
                        · 마감 {formatDate(q.close_at)} · 확정{" "}
                        {formatDate(q.resolve_at)}
                        {q.issue_id &&
                          ` · ${issues.find((i) => i.id === q.issue_id)?.title ?? ""}`}
                      </span>
                    </p>
                    <p className="mt-1 t-body-2 !font-semibold">{q.title}</p>
                    {q.description && (
                      <p className="mt-0.5 line-clamp-2 t-label-1 text-label-alt">
                        {q.description}
                      </p>
                    )}
                    <PrivateActions id={q.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "issues" && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-10">
          <section className={`${card} p-5 md:p-6 lg:self-start`}>
            <h2 className="mb-5 t-heading-2">새 이슈 묶음</h2>
            <IssueForm />
          </section>
          <section className="min-w-0">
            <h2 className="t-heading-2">
              이슈 묶음{" "}
              <span className="t-body-2 text-label-assist">
                {issues.length}
              </span>
            </h2>
            {issues.length === 0 ? (
              <p className="mt-3 rounded-xl bg-bg-alt py-10 text-center t-label-1 text-label-alt">
                아직 이슈 묶음이 없어요.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {issues.map((i) => (
                  <li key={i.id} className={`${card} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="t-body-2 !font-bold">{i.title}</p>
                        <p className="t-caption-1 text-label-alt">
                          질문 {issueCount.get(i.id) ?? 0}개 · 맥락{" "}
                          {i.context_lines.length}줄
                        </p>
                      </div>
                      <DeleteIssueButton
                        id={i.id}
                        count={issueCount.get(i.id) ?? 0}
                      />
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer t-label-2 !font-semibold text-primary">
                        수정
                      </summary>
                      <div className="mt-3">
                        <IssueForm issue={i} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "questions" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="상태" className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "전체"],
                  ["open", "진행 중"],
                  ["pending", "판정 대기"],
                  ["done", "완료"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={value === "all" ? "/admin" : `/admin?filter=${value}`}
                  className={`${chip(filter === value)} !h-8 gap-1 !px-3`}
                >
                  {label}
                  <span className="t-caption-1 opacity-60">
                    {counts[value]}
                  </span>
                </Link>
              ))}
            </nav>
            <Link href="/admin?tab=new" className={button.smallPrimary}>
              새 질문
            </Link>
          </div>

          {list.length === 0 ? (
            <p className="mt-4 rounded-xl bg-bg-alt py-10 text-center t-label-1 text-label-alt">
              해당하는 질문이 없어요.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-alt">
              {list.map((q) => (
                <li key={q.id} className="py-4">
                  <Link href={`/questions/${q.id}`} className="block">
                    <p className="flex flex-wrap items-center gap-x-1.5 t-caption-1 text-label-alt">
                      {overdue(q) && (
                        <span className="rounded bg-accent-red px-1.5 py-0.5 !font-semibold text-negative-strong">
                          판정 예정일 지남
                        </span>
                      )}
                      <span>
                        {categoryLabel(q.category)}
                        {q.type === "choice" &&
                          ` · 객관식 ${q.options.length}`}{" "}
                        · {statusLabel(q)} · 마감 {formatDate(q.close_at)} ·
                        확정 {formatDate(q.resolve_at)}
                      </span>
                    </p>
                    <p className="mt-1 t-body-2 !font-semibold hover:text-primary">
                      {q.title}
                    </p>
                  </Link>
                  {issues.length > 0 && (
                    <form
                      action={setQuestionIssue}
                      className="mt-2 flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={q.id} />
                      <select
                        name="issue_id"
                        defaultValue={q.issue_id ?? ""}
                        aria-label="이슈 묶음"
                        className={`${input} !w-auto min-w-0 !py-1.5 t-label-2`}
                      >
                        <option value="">이슈 없음</option>
                        {issues.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title}
                          </option>
                        ))}
                      </select>
                      <button className={`${button.smallSecondary} shrink-0`}>
                        이슈 저장
                      </button>
                    </form>
                  )}
                  <QuestionActions
                    id={q.id}
                    type={q.type}
                    options={q.options}
                    canClose={q.status === "open"}
                    accepting={isAccepting(q)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </PageShell>
  );
}
