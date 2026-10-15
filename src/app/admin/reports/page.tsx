import Link from "next/link";
import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import { button, card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { AUTO_HIDE_REPORTS, timeAgo } from "@/lib/discussion";
import { removeComment, setHidden } from "./actions";

export const metadata = { title: "신고된 댓글" };

type ReportRow = { comment_id: string; reason: string; created_at: string };
type CommentRow = {
  id: string;
  question_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  profiles: { nickname: string } | null;
  questions: { title: string } | null;
};

export default async function AdminReportsPage() {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/admin");

  const { data: reportData } = await supabase
    .from("reports")
    .select("comment_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const reports = (reportData ?? []) as ReportRow[];
  const ids = [...new Set(reports.map((r) => r.comment_id))];

  const { data: commentData } = ids.length
    ? await supabase
        .from("comments")
        .select(
          "id, question_id, body, hidden, created_at, profiles!comments_user_id_fkey(nickname), questions(title)",
        )
        .in("id", ids)
    : { data: [] };
  const comments = ((commentData ?? []) as unknown as CommentRow[])
    .map((c) => ({
      ...c,
      reports: reports.filter((r) => r.comment_id === c.id),
    }))
    // 숨겨진 것부터, 신고가 많은 순
    .sort(
      (a, b) =>
        Number(b.hidden) - Number(a.hidden) ||
        b.reports.length - a.reports.length,
    );

  return (
    <PageShell>
      <Link
        href="/admin"
        className="inline-flex items-center gap-0.5 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        관리자
      </Link>
      <h1 className="mt-3 t-heading-1 md:t-title-3">신고된 댓글</h1>
      <p className="mt-1 t-label-1 text-label-alt">
        신고가 {AUTO_HIDE_REPORTS}건 쌓이면 자동으로 숨겨져요. 확인 후 다시
        보이게 하거나 삭제할 수 있어요.
      </p>

      <div className="mt-6">
        {comments.length === 0 ? (
          <EmptyState message="신고된 댓글이 없어요." />
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className={`${card} p-5`}>
                <div className="flex flex-wrap items-center gap-2 t-caption-1 text-label-alt">
                  <span
                    className={`rounded-md px-2 py-0.5 !font-semibold ${
                      c.hidden
                        ? "bg-accent-red text-negative-strong"
                        : "bg-fill text-label-neutral"
                    }`}
                  >
                    {c.hidden ? "숨김" : "공개 중"}
                  </span>
                  <span>신고 {c.reports.length}건</span>
                  <span>·</span>
                  <span>{c.profiles?.nickname ?? "알 수 없음"}</span>
                  <span>·</span>
                  <span>{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words t-body-3">
                  {c.body}
                </p>
                <Link
                  href={`/questions/${c.question_id}`}
                  className="mt-2 block truncate t-caption-1 text-primary"
                >
                  {c.questions?.title ?? "질문 보기"}
                </Link>
                {c.reports.some((r) => r.reason) && (
                  <ul className="mt-3 flex flex-col gap-1 rounded-lg bg-bg-alt p-3 t-caption-1 text-label-neutral">
                    {c.reports
                      .filter((r) => r.reason)
                      .slice(0, 5)
                      .map((r, i) => (
                        <li key={i}>“{r.reason}”</li>
                      ))}
                  </ul>
                )}
                <div className="mt-3 flex gap-2">
                  <form action={setHidden}>
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      type="hidden"
                      name="hidden"
                      value={String(!c.hidden)}
                    />
                    <button className={button.smallSecondary}>
                      {c.hidden ? "다시 보이기" : "숨기기"}
                    </button>
                  </form>
                  <form action={removeComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className={button.smallDanger}>삭제</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
