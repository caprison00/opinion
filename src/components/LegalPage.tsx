import Link from "next/link";
import { notFound } from "next/navigation";
import LegalContent from "./LegalContent";
import PageShell from "./PageShell";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/questions";
import {
  LEGAL_KINDS,
  legalLabel,
  splitVersions,
  type LegalDocument,
  type LegalKind,
} from "@/lib/legal";

export default async function LegalPage({
  kind,
  version,
}: {
  kind: LegalKind;
  version?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("kind", kind);
  const docs = (data ?? []) as LegalDocument[];
  const { current, effective, scheduled } = splitVersions(docs);

  // ?v=1.0 으로 지난 버전이나 시행 예정 버전을 볼 수 있다.
  const shown = version ? docs.find((d) => d.version === version) : current;
  if (version && !shown) notFound();

  const label = legalLabel(kind);
  const path = LEGAL_KINDS.find((k) => k.value === kind)!.path;
  const isScheduled = shown ? new Date(shown.effective_at) > new Date() : false;
  const versions = [...scheduled, ...effective];

  return (
    <PageShell narrow>
      <h1 className="t-heading-1 md:t-title-3">{label}</h1>

      {scheduled.length > 0 && !isScheduled && (
        <Link
          href={`${path}?v=${scheduled[scheduled.length - 1].version}`}
          className="mt-5 block rounded-[14px] bg-accent-blue px-4 py-3 t-label-1 text-primary"
        >
          {formatDate(scheduled[scheduled.length - 1].effective_at)}부터 새{" "}
          {label}(버전 {scheduled[scheduled.length - 1].version})이 시행돼요.
          미리 보기
        </Link>
      )}

      {!shown ? (
        <p className="mt-6 rounded-[18px] bg-bg-alt py-16 text-center t-body-2 text-label-alt">
          아직 게시된 {label}이 없어요.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-bg-alt px-4 py-3 t-label-1">
            <span className="!font-semibold text-label">
              버전 {shown.version}
            </span>
            <span className="text-label-alt">
              {isScheduled ? "시행 예정일" : "시행일"}{" "}
              {formatDate(shown.effective_at)}
            </span>
            {shown.id === current?.id && (
              <span className="rounded-md bg-accent-blue px-2 py-0.5 t-caption-1 !font-semibold text-primary">
                현재 시행 중
              </span>
            )}
            {isScheduled && (
              <span className="rounded-md bg-accent-orange px-2 py-0.5 t-caption-1 !font-semibold text-caution-text">
                시행 예정
              </span>
            )}
          </div>

          <article className="mt-6">
            <LegalContent content={shown.content} />
          </article>

          {versions.length > 1 && (
            <section className="mt-12 border-t border-line pt-6">
              <h2 className="t-body-1 !font-bold">변경 이력</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {versions.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={
                        d.id === current?.id ? path : `${path}?v=${d.version}`
                      }
                      className={`flex justify-between rounded-lg px-3 py-2 t-label-1 hover:bg-fill ${
                        d.id === shown.id
                          ? "bg-fill !font-semibold text-label"
                          : "text-label-neutral"
                      }`}
                    >
                      <span>버전 {d.version}</span>
                      <span className="text-label-alt">
                        {formatDate(d.effective_at)}
                        {new Date(d.effective_at) > new Date()
                          ? " 시행 예정"
                          : " 시행"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
