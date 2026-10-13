import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { button, card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  compareVersions,
  LEGAL_KINDS,
  splitVersions,
  type LegalDocument,
  type LegalKind,
} from "@/lib/legal";
import { formatDate } from "@/lib/questions";
import { deleteScheduledLegal } from "./actions";
import LegalForm from "./LegalForm";

export const metadata = { title: "약관 관리" };

export default async function AdminLegalPage() {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/admin");

  const { data } = await supabase.from("legal_documents").select("*");
  const docs = (data ?? []) as LegalDocument[];

  const latest = Object.fromEntries(
    LEGAL_KINDS.map((k) => {
      const mine = docs
        .filter((d) => d.kind === k.value)
        .sort((a, b) => compareVersions(b.version, a.version));
      return [
        k.value,
        mine[0] ? { version: mine[0].version, content: mine[0].content } : null,
      ];
    }),
  ) as Record<LegalKind, { version: string; content: string } | null>;

  return (
    <PageShell>
      <Link
        href="/admin"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        관리자
      </Link>
      <h1 className="mt-3 t-heading-1 md:t-title-3">약관 관리</h1>
      <p className="mt-1 t-label-1 text-label-alt">
        새 버전을 게시하면 이전 버전은 변경 이력으로 남아요. 시행된 버전은
        수정하거나 지울 수 없어요.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <section className={`${card} p-5 md:p-6`}>
          <h2 className="mb-5 t-heading-2">새 버전 게시</h2>
          <LegalForm latest={latest} />
        </section>

        <aside className="flex flex-col gap-8">
          {LEGAL_KINDS.map((k) => {
            const { current, effective, scheduled } = splitVersions(
              docs.filter((d) => d.kind === k.value),
            );
            const list = [...scheduled, ...effective];
            return (
              <section key={k.value}>
                <div className="flex items-center justify-between">
                  <h2 className="t-body-1 !font-bold">{k.label}</h2>
                  <Link href={k.path} className="t-label-1 text-primary">
                    보기
                  </Link>
                </div>
                {list.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-bg-alt px-4 py-3 t-label-1 text-label-alt">
                    아직 게시된 버전이 없어요.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-line-alt">
                    {list.map((d) => {
                      const isScheduled = new Date(d.effective_at) > new Date();
                      return (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div>
                            <Link
                              href={`${k.path}?v=${d.version}`}
                              className="t-body-3 !font-semibold hover:text-primary"
                            >
                              버전 {d.version}
                            </Link>
                            <p className="t-caption-1 text-label-alt">
                              {formatDate(d.effective_at)}{" "}
                              {isScheduled
                                ? "시행 예정"
                                : d.id === current?.id
                                  ? "시행 중"
                                  : "시행 종료"}
                            </p>
                          </div>
                          {isScheduled && (
                            <form action={deleteScheduledLegal}>
                              <input type="hidden" name="id" value={d.id} />
                              <button className={button.smallSecondary}>
                                취소
                              </button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </aside>
      </div>
    </PageShell>
  );
}
