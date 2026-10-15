import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import type { Question } from "@/lib/questions";
import QuestionForm from "../../../QuestionForm";

export const metadata = { title: "비공개 질문 수정" };

export default async function EditPrivateQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/admin");

  const [{ data }, { data: issueData }] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("issues")
      .select("id, title")
      .order("created_at", { ascending: false }),
  ]);
  const q = data as Question | null;
  if (!q) notFound();

  return (
    <PageShell>
      <Link
        href="/admin?tab=private"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        비공개 질문
      </Link>
      <h1 className="mt-3 t-heading-1 md:t-title-3">비공개 질문 수정</h1>

      {q.is_public !== false ? (
        <p className="mt-6 rounded-xl bg-bg-alt px-4 py-6 text-center t-body-2 text-label-alt">
          이미 공개된 질문은 수정할 수 없어요. 예측한 사람들의 기준이 바뀌지
          않도록 하기 위해서예요.
        </p>
      ) : (
        <section className={`${card} mt-6 max-w-[640px] p-5 md:p-6`}>
          <QuestionForm
            issues={(issueData ?? []) as { id: string; title: string }[]}
            question={q}
          />
        </section>
      )}
    </PageShell>
  );
}
