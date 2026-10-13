import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import {
  categoryLabel,
  formatDate,
  statusLabel,
  timeLeft,
  type Question,
} from "@/lib/questions";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const q = data as Question;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10">
      <Header />
      <Link href="/" className="text-sm text-gray-500">
        ← 목록으로
      </Link>

      <article className="mt-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
            {categoryLabel(q.category)}
          </span>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-600">
            {statusLabel(q)}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug">{q.title}</h1>

        {q.description && (
          <p className="mt-3 whitespace-pre-line text-gray-700">
            {q.description}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          <dt className="text-gray-500">예측 마감</dt>
          <dd>
            {formatDate(q.close_at)}{" "}
            <span className="text-orange-600">({timeLeft(q.close_at)})</span>
          </dd>
          <dt className="text-gray-500">결과 확정</dt>
          <dd>{formatDate(q.resolve_at)} 예정</dd>
          <dt className="text-gray-500">판정 출처</dt>
          <dd className="whitespace-pre-line break-words">
            {q.resolution_source}
          </dd>
        </dl>

        <section className="mt-5 rounded-2xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-500">현재 집단 확률</p>
          <p className="mt-1 text-3xl font-bold text-gray-300">–</p>
          <p className="mt-3 text-xs text-gray-400">
            예측 입력은 다음 단계에서 추가됩니다.
          </p>
        </section>
      </article>
    </main>
  );
}
