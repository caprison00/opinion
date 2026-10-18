import Link from "next/link";
import CategoryTabs from "@/components/CategoryTabs";
import EmptyState from "@/components/EmptyState";
import { ChevronLeftIcon } from "@/components/icons";
import PageShell from "@/components/PageShell";
import QuestionCard from "@/components/QuestionCard";
import SortMenu from "@/components/SortMenu";
import { button } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { EMPTY_BOARD, getBoards, type Issue } from "@/lib/board";
import { pickImage } from "@/lib/images";
import {
  CATEGORIES,
  categoryLabel,
  isAccepting,
  isCategory,
  type Category,
  type Question,
} from "@/lib/questions";

export const metadata = { title: "전체 질문" };

const PAGE_SIZE = 12;

type Status = "open" | "done";

const SORTS: Record<Status, { value: string; label: string }[]> = {
  open: [
    { value: "closing", label: "마감 임박순" },
    { value: "new", label: "새로 공개된순" },
    { value: "popular", label: "참여 많은순" },
    { value: "moving", label: "여론 변동 큰순" },
  ],
  done: [
    { value: "resolved", label: "최근 판정순" },
    { value: "popular", label: "참여 많은순" },
    { value: "hard", label: "적게 맞힌순" },
  ],
};

// 전체 질문 목록: 진행 중 / 마감·판정 + 분야 + 정렬, 12개씩 더 보기
// 주소: /questions?status=open|done&category=<분야>&sort=<정렬>&page=<n>
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const status: Status = sp.status === "done" ? "done" : "open";
  const category = isCategory(sp.category) ? sp.category : null;
  const sort = SORTS[status].some((s) => s.value === sp.sort)
    ? sp.sort!
    : SORTS[status][0].value;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));

  const { supabase } = await getViewer();
  // 공개 질문만 (비공개는 RLS로도 관리자에게만 보인다)
  const [{ data }, { data: movingData }] = await Promise.all([
    supabase.from("questions").select("*").eq("is_public", true),
    status === "open" && sort === "moving"
      ? supabase.rpc("moving_questions", { p_limit: 20 })
      : Promise.resolve({ data: null }),
  ]);
  const all = (data ?? []) as Question[];
  // 진행 중 = 홈과 같은 기준(공개·open·마감 전), 마감·판정 = 그 밖(마감·판정 대기·판정·무효)
  const byStatus = {
    open: all.filter((q) => isAccepting(q)),
    done: all.filter((q) => !isAccepting(q)),
  };
  const pool = byStatus[status];

  // 분야 탭 숫자: 지금 고른 상태 기준
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.value,
      pool.filter((q) => q.category === c.value).length,
    ]),
  ) as Record<Category, number>;
  const inCategory = category
    ? pool.filter((q) => q.category === category)
    : pool;

  const boards = await getBoards(
    supabase,
    inCategory.map((q) => q.id),
  );
  const boardOf = (id: string) => boards.get(id) ?? EMPTY_BOARD;

  const sorted = sortQuestions(
    inCategory,
    sort,
    boardOf,
    ((movingData ?? []) as { question_id: string }[]).map((m) => m.question_id),
  );
  const shown = sorted.slice(0, page * PAGE_SIZE);

  // 사진이 없는 질문은 이슈 묶음 사진
  const issueIds = [
    ...new Set(shown.map((q) => q.issue_id).filter((x): x is string => !!x)),
  ];
  const { data: issueData } = issueIds.length
    ? await supabase.from("issues").select("*").in("id", issueIds)
    : { data: [] };
  const issueById = new Map(
    ((issueData ?? []) as Issue[]).map((i) => [i.id, i]),
  );

  const href = (p: {
    status?: Status;
    category?: Category | null;
    sort?: string;
    page?: number;
  }) => {
    const st = p.status ?? status;
    const params = new URLSearchParams();
    if (st !== "open") params.set("status", st);
    const cat = p.category === undefined ? category : p.category;
    if (cat) params.set("category", cat);
    // 상태를 바꾸면 그 상태의 기본 정렬로
    const so = p.sort ?? (p.status && p.status !== status ? undefined : sort);
    if (so && so !== SORTS[st][0].value) params.set("sort", so);
    if (p.page && p.page > 1) params.set("page", String(p.page));
    const qs = params.toString();
    return qs ? `/questions?${qs}` : "/questions";
  };

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-1 t-label-1 text-label-alt hover:text-label"
      >
        <ChevronLeftIcon className="h-4 w-4" />홈
      </Link>
      <h1 className="mt-2 t-title-3 lg:t-title-1">전체 질문</h1>

      <div className="mt-4">
        <CategoryTabs
          active={category}
          firstLabel="전체"
          hrefOf={(c) => href({ category: c, page: 1 })}
          counts={{ total: pool.length, byCategory }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div
          className="inline-flex gap-0.5 rounded-xl bg-bg-alt p-[3px]"
          role="group"
          aria-label="질문 상태"
        >
          {(["open", "done"] as Status[]).map((st) => (
            <Link
              key={st}
              href={href({ status: st, page: 1 })}
              scroll={false}
              aria-current={st === status ? "page" : undefined}
              className={`flex h-9 items-center gap-1 rounded-[9px] px-3 t-label-1 !font-extrabold transition-colors ${
                st === status
                  ? "bg-surface text-label shadow-xsmall"
                  : "text-label-neutral hover:text-label"
              }`}
            >
              {st === "open" ? "진행 중" : "마감·판정"}{" "}
              <span className="num !font-medium opacity-80">
                {byStatus[st].length}
              </span>
            </Link>
          ))}
        </div>
        <SortMenu
          value={sort}
          options={SORTS[status].map((s) => ({
            ...s,
            href: href({ sort: s.value, page: 1 }),
          }))}
        />
      </div>

      <div className="mt-5">
        {shown.length === 0 ? (
          <EmptyState
            message={`${category ? `${categoryLabel(category)} 분야에 ` : ""}${
              status === "open" ? "진행 중인" : "마감·판정된"
            } 질문이 없어요.`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                board={boardOf(q.id)}
                image={pickImage(
                  q,
                  q.issue_id ? issueById.get(q.issue_id) : null,
                )}
              />
            ))}
          </div>
        )}
        {sorted.length > shown.length && (
          <div className="mt-6 flex justify-center">
            <Link
              href={href({ page: page + 1 })}
              scroll={false}
              className={button.secondary}
            >
              질문 더 보기
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function sortQuestions(
  list: Question[],
  sort: string,
  boardOf: (id: string) => { participants: number; hitRate: number | null },
  movingIds: string[],
) {
  const byClose = (a: Question, b: Question) =>
    a.close_at.localeCompare(b.close_at);
  const copy = [...list];
  switch (sort) {
    case "new":
      return copy.sort((a, b) => b.open_at.localeCompare(a.open_at));
    case "popular":
      return copy.sort(
        (a, b) =>
          boardOf(b.id).participants - boardOf(a.id).participants ||
          byClose(a, b),
      );
    case "moving": {
      // 홈 '지금 여론이 움직이는 질문'과 같은 순서(DB 함수, 최대 20개), 나머지는 마감 임박순
      const rank = new Map(movingIds.map((id, i) => [id, i]));
      return copy.sort(
        (a, b) =>
          (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) ||
          byClose(a, b),
      );
    }
    case "resolved": {
      const t = (q: Question) => q.resolved_at ?? q.close_at;
      return copy.sort((a, b) => t(b).localeCompare(t(a)));
    }
    case "hard": {
      // 판정된 질문의 적중 비율 낮은 순, 비율이 없으면(판정 전·무효·참여 0) 뒤로
      const rate = (q: Question) => {
        const r = boardOf(q.id).hitRate;
        return q.status === "resolved" && r !== null ? r : Infinity;
      };
      return copy.sort((a, b) => rate(a) - rate(b));
    }
    default:
      return copy.sort(byClose);
  }
}
