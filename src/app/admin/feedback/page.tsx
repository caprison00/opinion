import Link from "next/link";
import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { timeAgo } from "@/lib/discussion";

export const metadata = { title: "디자인 의견" };

type Row = {
  id: string;
  looks_like: string;
  want_click: "A" | "B" | "same";
  trust: "A" | "B" | "same";
  comment: string;
  device: string;
  created_at: string;
};

const LABEL = { A: "A안", B: "B안", same: "비슷" } as const;

function Tally({
  title,
  rows,
  k,
}: {
  title: string;
  rows: Row[];
  k: "want_click" | "trust";
}) {
  const total = rows.length || 1;
  return (
    <section className={`${card} p-5`}>
      <h2 className="t-body-1 !font-bold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {(["A", "B", "same"] as const).map((v) => {
          const n = rows.filter((r) => r[k] === v).length;
          const pct = Math.round((n / total) * 100);
          return (
            <li key={v}>
              <div className="flex justify-between t-label-1">
                <span className="!font-semibold">{LABEL[v]}</span>
                <span className="tabular-nums text-label-alt">
                  {n}명 · {pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-fill-strong">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function AdminFeedbackPage() {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/admin");

  const { data } = await supabase
    .from("design_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as Row[];

  return (
    <PageShell>
      <Link
        href="/admin"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        관리자
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="t-heading-1 md:t-title-3">디자인 의견</h1>
          <p className="mt-1 t-label-1 text-label-alt">
            응답 {rows.length}개 · 받는 주소{" "}
            <Link href="/compare" className="text-primary underline">
              /compare
            </Link>
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="아직 응답이 없어요. /compare 주소를 지인에게 보내 보세요." />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Tally
              title="예측 버튼을 누르고 싶은 쪽"
              rows={rows}
              k="want_click"
            />
            <Tally title="더 믿음이 가는 쪽" rows={rows} k="trust" />
          </div>
          <h2 className="mt-10 t-heading-2">응답 하나하나</h2>
          <ul className="mt-3 divide-y divide-line-alt">
            {rows.map((r) => (
              <li key={r.id} className="py-4">
                <p className="t-caption-1 text-label-alt">
                  {timeAgo(r.created_at)} ·{" "}
                  {r.device === "mobile" ? "모바일" : "PC"} · 누르고 싶은 쪽{" "}
                  {LABEL[r.want_click]} · 믿음 {LABEL[r.trust]}
                </p>
                {r.looks_like && (
                  <p className="mt-1 t-body-2">
                    <span className="text-label-alt">어떤 서비스 같아요: </span>
                    {r.looks_like}
                  </p>
                )}
                {r.comment && (
                  <p className="mt-1 whitespace-pre-line t-body-2 text-label-neutral">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
