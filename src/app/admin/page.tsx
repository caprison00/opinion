import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getViewer } from "@/lib/auth";
import {
  categoryLabel,
  formatDate,
  statusLabel,
  type Question,
} from "@/lib/questions";
import QuestionForm from "./QuestionForm";

export default async function AdminPage() {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");

  if (!isAdmin) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4">
        <Header />
        <p className="py-16 text-center text-gray-500">
          관리자만 볼 수 있는 화면이에요.
        </p>
      </main>
    );
  }

  const { data } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });
  const questions = (data ?? []) as Question[];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Header />
      <h1 className="text-xl font-bold">새 질문 만들기</h1>
      <div className="mt-4">
        <QuestionForm />
      </div>

      <h2 className="mt-10 text-lg font-bold">전체 질문 ({questions.length})</h2>
      <ul className="mt-3 divide-y divide-gray-100">
        {questions.map((q) => (
          <li key={q.id} className="py-3">
            <Link href={`/questions/${q.id}`} className="block">
              <p className="text-xs text-gray-500">
                {categoryLabel(q.category)} · {statusLabel(q)} · 마감{" "}
                {formatDate(q.close_at)}
              </p>
              <p className="mt-0.5 font-medium">{q.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
