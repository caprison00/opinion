import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { button, card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  statusLabel,
  type Question,
} from "@/lib/questions";
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

  const { data } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });
  const questions = (data ?? []) as Question[];

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="t-heading-1 md:t-title-3">관리자</h1>
        <div className="flex gap-2">
          <Link href="/admin/stats" className={button.smallSecondary}>
            통계
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
          <QuestionForm />
        </section>

        <section className="min-w-0">
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
                    {categoryLabel(q.category)} · {statusLabel(q)} · 마감{" "}
                    {formatDate(q.close_at)}
                  </p>
                  <p className="mt-1 t-body-2 !font-semibold hover:text-primary">
                    {q.title}
                  </p>
                </Link>
                <QuestionActions
                  id={q.id}
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
