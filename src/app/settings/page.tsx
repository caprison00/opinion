import PageShell from "@/components/PageShell";
import { card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import DeleteAccount from "./DeleteAccount";
import ThemeChoice from "./ThemeChoice";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const { user } = await getViewer();

  return (
    <PageShell narrow>
      <h1 className="t-heading-1 md:t-title-3">설정</h1>

      <section
        className={`${card} mt-5 flex flex-wrap items-center justify-between gap-3 p-5`}
      >
        <div>
          <h2 className="t-body-1 !font-bold">화면 모드</h2>
          <p className="mt-0.5 t-caption-1 text-label-alt">
            이 브라우저에만 저장돼요.
          </p>
        </div>
        <ThemeChoice />
      </section>

      {user && (
        <section className="mt-16">
          <DeleteAccount />
        </section>
      )}
    </PageShell>
  );
}
