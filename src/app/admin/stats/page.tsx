import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { card, chip } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import DailyChart, { type DailyRow } from "./DailyChart";

export const metadata = { title: "통계" };

const PERIODS = [7, 30, 90] as const;

type Daily = DailyRow & { member_visitors: number; mobile_visitors: number };
type TopRow = { label: string; views: number; visitors: number };

// 한국 날짜(YYYY-MM-DD)
function kstDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    date,
  );
}

function lastDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(kstDay(new Date(Date.now() - i * 86_400_000)));
  }
  return days;
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/admin");

  const { days: rawDays } = await searchParams;
  const period = PERIODS.find((p) => String(p) === rawDays) ?? 30;
  const days = lastDays(period);
  const since = days[0];
  const sinceIso = new Date(`${since}T00:00:00+09:00`).toISOString();

  const [
    { data: dailyData },
    { data: pagesData },
    { data: refData },
    { count: newMembers },
    { count: totalMembers },
    { count: newPredictions },
  ] = await Promise.all([
    supabase.from("visit_daily").select("*").gte("day", since),
    supabase.rpc("visit_top", { p_since: since, p_kind: "path" }),
    supabase.rpc("visit_top", { p_since: since, p_kind: "referrer" }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso),
  ]);

  const byDay = new Map(((dailyData ?? []) as Daily[]).map((d) => [d.day, d]));
  const rows: Daily[] = days.map(
    (day) =>
      byDay.get(day) ?? {
        day,
        visitors: 0,
        page_views: 0,
        member_visitors: 0,
        mobile_visitors: 0,
      },
  );
  const today = rows[rows.length - 1];
  const sum = (k: keyof Omit<Daily, "day">) =>
    rows.reduce((a, r) => a + r[k], 0);
  const visitorDays = sum("visitors");
  const avgVisitors = Math.round(visitorDays / period);
  const pct = (part: number) =>
    visitorDays ? `${Math.round((part / visitorDays) * 100)}%` : "–";

  const tiles = [
    {
      label: "오늘 방문자",
      value: today.visitors,
      hint: `페이지뷰 ${today.page_views}`,
    },
    { label: "하루 평균 방문자", value: avgVisitors, hint: `최근 ${period}일` },
    { label: "페이지뷰", value: sum("page_views"), hint: `최근 ${period}일` },
    {
      label: "신규 가입",
      value: newMembers ?? 0,
      hint: `전체 회원 ${totalMembers ?? 0}명`,
    },
    { label: "새 예측", value: newPredictions ?? 0, hint: `최근 ${period}일` },
  ];

  return (
    <PageShell>
      <Link
        href="/admin"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        관리자
      </Link>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="t-heading-1 md:t-title-3">통계</h1>
          <p className="mt-1 t-label-1 text-label-alt">
            방문자는 하루 단위로 세요. 관리자 본인의 방문은 빠져 있어요.
          </p>
        </div>
        <nav className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/stats?days=${p}`}
              className={chip(p === period)}
            >
              {p}일
            </Link>
          ))}
        </nav>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-bg-alt p-4 md:p-5">
            <p className="t-label-2 text-label-alt">{t.label}</p>
            <p className="mt-1 t-title-3 tabular-nums">
              {t.value.toLocaleString("ko-KR")}
            </p>
            <p className="mt-1 t-caption-1 text-label-alt">{t.hint}</p>
          </div>
        ))}
      </section>

      <section className={`${card} mt-4 p-5 md:p-6`}>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="t-body-1 !font-bold">일별 방문자</h2>
          <p className="t-caption-1 text-label-alt">
            모바일 {pct(sum("mobile_visitors"))} · 로그인 회원{" "}
            {pct(sum("member_visitors"))}
          </p>
        </div>
        <DailyChart rows={rows} />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList
          title="많이 본 페이지"
          rows={(pagesData ?? []) as TopRow[]}
          empty="아직 기록이 없어요."
        />
        <TopList
          title="유입 경로"
          rows={(refData ?? []) as TopRow[]}
          empty="아직 기록이 없어요."
        />
      </div>
    </PageShell>
  );
}

function TopList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: TopRow[];
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.views), 1);
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex items-baseline justify-between">
        <h2 className="t-body-1 !font-bold">{title}</h2>
        <span className="t-caption-1 text-label-alt">페이지뷰</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 t-label-1 text-label-alt">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {rows.map((r) => (
            <li
              key={r.label}
              className="relative flex items-center justify-between gap-3 rounded-lg px-3 py-2"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-lg bg-accent-blue"
                style={{ width: `${(r.views / max) * 100}%` }}
                aria-hidden="true"
              />
              <span className="relative min-w-0 truncate t-label-1 text-label">
                {r.label}
              </span>
              <span className="relative shrink-0 t-label-1 !font-semibold tabular-nums">
                {r.views.toLocaleString("ko-KR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
