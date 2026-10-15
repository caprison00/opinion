import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { AlertIcon } from "@/components/icons";
import { button, card, input } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  statusLabel,
  type Question,
} from "@/lib/questions";
import { setQuestionIssue } from "./actions";
import IssueForm from "./IssueForm";
import QuestionActions from "./QuestionActions";
import QuestionForm from "./QuestionForm";

export const metadata = { title: "관리자" };

export default async function AdminPage() {
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
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);
  const questions = (data ?? []) as Question[];
  const issues = (issueData ?? []) as { id: string; title: string }[];
  const issueCount = new Map<string, number>();
  for (const q of questions) {
    if (q.issue_id)
      issueCount.set(q.issue_id, (issueCount.get(q.issue_id) ?? 0) + 1);
  }

  // 운영 규칙: 48시간 안에 판정되는 진행 중(또는 마감) 질문이 항상 1개 이상 있어야 한다.
  const soon = Date.now() + 48 * 3_600_000;
  const resolvingSoon = questions.filter(
    (q) =>
      (q.status === "open" || q.status === "closed") &&
      new Date(q.resolve_at).getTime() <= soon,
  ).length;

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="t-heading-1 md:t-title-3">관리자</h1>
        <div className="flex gap-2">
          <Link href="/admin/stats" className={button.smallSecondary}>
            통계
          </Link>
          <Link href="/admin/reports" className={button.smallSecondary}>
            신고
          </Link>
          <Link href="/admin/legal" className={button.smallSecondary}>
            약관 관리
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-10">
        <section
          className={`${card} p-5 md:p-6 lg:sticky lg:top-24 lg:self-start`}
        >
          <h2 className="mb-5 t-heading-2">새 질문 만들기</h2>
          <QuestionForm issues={issues} />
          <div className="mt-8 border-t border-line pt-6">
            <h2 className="mb-5 t-heading-2">새 이슈 묶음</h2>
            <IssueForm />
          </div>
        </section>

        <section className="min-w-0">
          {resolvingSoon === 0 && (
            <p className="mb-6 flex items-start gap-2 rounded-xl bg-accent-orange px-4 py-3 t-label-1 text-caution-text">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              48시간 안에 판정되는 질문이 없어요. 결과 확정이 가까운 질문을 하나
              이상 만들어 주세요.
            </p>
          )}

          {issues.length > 0 && (
            <div className="mb-8">
              <h2 className="t-heading-2">
                이슈 묶음{" "}
                <span className="t-body-2 text-label-assist">
                  {issues.length}
                </span>
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {issues.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-full bg-fill px-3 py-1.5 t-label-2 text-label-neutral"
                  >
                    {i.title}{" "}
                    <span className="text-label-assist">
                      질문 {issueCount.get(i.id) ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="t-heading-2">
            전체 질문{" "}
            <span className="t-body-2 text-label-assist">
              {questions.length}
            </span>
          </h2>
          <ul className="mt-3 divide-y divide-line-alt">
            {questions.map((q) => (
              <li key={q.id} className="py-4">
                <Link href={`/questions/${q.id}`} className="block">
                  <p className="t-caption-1 text-label-alt">
                    {categoryLabel(q.category)}
                    {q.type === "choice" &&
                      ` · 객관식 ${q.options.length}`} · {statusLabel(q)} · 마감{" "}
                    {formatDate(q.close_at)}
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
                      className={`${input} !w-auto !py-1.5 t-label-2`}
                    >
                      <option value="">이슈 없음</option>
                      {issues.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                    <button className={button.smallSecondary}>이슈 저장</button>
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
        </section>
      </div>
    </PageShell>
  );
}
