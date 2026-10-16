import type { Metadata } from "next";
import Link from "next/link";
import BadgeIcon from "@/components/BadgeIcon";
import EmptyState from "@/components/EmptyState";
import PageShell from "@/components/PageShell";
import QuestionCard from "@/components/QuestionCard";
import { Thumb } from "@/components/QuestionImage";
import SearchBox from "@/components/SearchBox";
import TierMark from "@/components/TierMark";
import { card, pillBar, textTab } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { getFeaturedBadges } from "@/lib/badges";
import { EMPTY_BOARD, getBoards, type Issue } from "@/lib/board";
import { pickImage } from "@/lib/images";
import {
  CATEGORIES,
  formatDate,
  isCategory,
  type Question,
} from "@/lib/questions";
import { getTiers } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "검색",
  robots: { index: false, follow: true },
};

const TABS = [
  { value: "questions", label: "질문" },
  { value: "issues", label: "이슈" },
  { value: "users", label: "사용자" },
  { value: "comments", label: "댓글" },
] as const;
type Tab = (typeof TABS)[number]["value"];

type SearchParams = {
  q?: string;
  tab?: string;
  status?: string;
  cat?: string;
};

// 같은 검색어로 탭·걸러보기만 바꾼 주소
function searchHref(base: SearchParams, change: SearchParams) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...change })) {
    if (v) p.set(k, v);
  }
  return `/search?${p.toString()}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 50);
  const tab: Tab = TABS.some((t) => t.value === sp.tab)
    ? (sp.tab as Tab)
    : "questions";
  const status = sp.status === "done" ? "done" : "open";
  const cat = isCategory(sp.cat) ? sp.cat : null;
  const base: SearchParams = {
    q,
    tab: tab === "questions" ? undefined : tab,
    status: tab === "questions" && status === "done" ? "done" : undefined,
    cat: tab === "questions" ? (cat ?? undefined) : undefined,
  };

  return (
    <PageShell>
      <h1 className="sr-only">검색</h1>
      <SearchBox
        q={q}
        autoFocus={!q}
        hidden={tab === "questions" ? {} : { tab }}
      />

      {!q ? (
        <p className="mt-10 text-center t-body-2 text-label-alt">
          질문 제목, 이슈 이름, 닉네임, 토론 댓글에서 찾아볼 수 있어요.
        </p>
      ) : (
        <>
          <nav aria-label="검색 대상" className="mt-5">
            <div className={`scroll-row ${pillBar}`}>
              {TABS.map((t) => (
                <Link
                  key={t.value}
                  href={searchHref(
                    { q },
                    { tab: t.value === "questions" ? undefined : t.value },
                  )}
                  aria-current={t.value === tab ? "page" : undefined}
                  className={textTab(t.value === tab)}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="mt-6">
            {tab === "questions" && (
              <QuestionResults q={q} status={status} cat={cat} base={base} />
            )}
            {tab === "issues" && <IssueResults q={q} />}
            {tab === "users" && <UserResults q={q} />}
            {tab === "comments" && <CommentResults q={q} />}
          </div>
        </>
      )}
    </PageShell>
  );
}

// 검색어와 같은 부분을 형광펜으로 표시
function Highlight({ text, q }: { text: string; q: string }) {
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let i = lower.indexOf(needle); i >= 0 && needle; ) {
    if (i > from) parts.push(text.slice(from, i));
    parts.push(
      <mark key={i} className="hl bg-transparent text-inherit">
        {text.slice(i, i + needle.length)}
      </mark>,
    );
    from = i + needle.length;
    i = lower.indexOf(needle, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

function ResultCount({ n, unit }: { n: number; unit: string }) {
  return (
    <p className="mb-3 t-label-1 text-label-neutral">
      {unit} <span className="!font-bold text-label">{n}</span>
      {n >= 30 ? "개 이상" : "개"}
    </p>
  );
}

async function QuestionResults({
  q,
  status,
  cat,
  base,
}: {
  q: string;
  status: "open" | "done";
  cat: string | null;
  base: SearchParams;
}) {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("search_questions", {
    p_q: q,
    p_status: status,
    p_category: cat,
    p_limit: 30,
  });
  const questions = (data ?? []) as Question[];
  const issueIds = [
    ...new Set(
      questions.map((x) => x.issue_id).filter((x): x is string => !!x),
    ),
  ];
  const [boards, { data: issueData }] = await Promise.all([
    getBoards(
      supabase,
      questions.map((x) => x.id),
    ),
    issueIds.length
      ? supabase.from("issues").select("*").in("id", issueIds)
      : Promise.resolve({ data: [] }),
  ]);
  const issueById = new Map(
    ((issueData ?? []) as Issue[]).map((i) => [i.id, i]),
  );

  return (
    <>
      <div className={`scroll-row ${pillBar}`}>
        <Link
          href={searchHref(base, { cat: undefined })}
          aria-current={!cat ? "page" : undefined}
          className={textTab(!cat)}
        >
          전체 분야
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={searchHref(base, { cat: c.value })}
            aria-current={c.value === cat ? "page" : undefined}
            className={textTab(c.value === cat)}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between gap-3">
        <p className="t-label-1 text-label-neutral">
          질문 <span className="!font-bold text-label">{questions.length}</span>
          {questions.length >= 30 ? "개 이상" : "개"}
        </p>
        <div className="flex gap-1">
          {(
            [
              ["open", "진행 중"],
              ["done", "마감·판정됨"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={searchHref(base, {
                status: v === "done" ? "done" : undefined,
              })}
              aria-current={v === status ? "page" : undefined}
              className={`rounded-[10px] px-3 py-2 t-label-2 !font-bold transition-colors ${
                v === status
                  ? "bg-brand text-white"
                  : "text-label-neutral hover:bg-fill"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          message={
            status === "open"
              ? "진행 중인 질문 중에는 찾는 질문이 없어요. 마감·판정됨도 확인해 보세요."
              : "찾는 질문이 없어요."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((x) => (
              <QuestionCard
                key={x.id}
                question={x}
                board={boards.get(x.id) ?? EMPTY_BOARD}
                image={pickImage(
                  x,
                  x.issue_id ? issueById.get(x.issue_id) : null,
                )}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

type IssueRow = Pick<
  Issue,
  "id" | "title" | "context_lines" | "image_url" | "image_credit" | "image_alt"
> & { open_count: number; total_count: number };

async function IssueResults({ q }: { q: string }) {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("search_issues", { p_q: q, p_limit: 20 });
  const issues = (data ?? []) as IssueRow[];
  if (!issues.length) return <EmptyState message="찾는 이슈가 없어요." />;

  return (
    <>
      <ResultCount n={issues.length} unit="이슈" />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {issues.map((i) => {
          const image = pickImage(i);
          const open = Number(i.open_count);
          return (
            <li key={i.id}>
              {/* 이슈 묶음은 따로 화면이 없어서, 그 이슈의 질문 검색으로 보낸다 */}
              <Link
                href={searchHref(
                  { q: i.title },
                  { status: open > 0 ? undefined : "done" },
                )}
                className={`${card} group flex h-full items-center gap-4 p-4`}
              >
                {image && (
                  <Thumb image={image} className="h-16 w-16 rounded-xl" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="t-body-1 !font-bold text-label group-hover:text-primary">
                    <Highlight text={i.title} q={q} />
                  </p>
                  {i.context_lines[0] && (
                    <p className="mt-0.5 line-clamp-1 t-caption-1 text-label-alt">
                      {i.context_lines[0]}
                    </p>
                  )}
                  <p className="mt-1.5 t-caption-1 !font-semibold text-primary">
                    {open > 0
                      ? `진행 중 질문 ${open}개`
                      : `지난 질문 ${Number(i.total_count)}개`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

async function UserResults({ q }: { q: string }) {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("search_users", { p_q: q, p_limit: 20 });
  const users = (data ?? []) as { id: string; nickname: string }[];
  if (!users.length) return <EmptyState message="찾는 닉네임이 없어요." />;
  const ids = users.map((u) => u.id);
  const [tiers, badges] = await Promise.all([
    getTiers(supabase, ids),
    getFeaturedBadges(supabase, ids),
  ]);

  return (
    <>
      <ResultCount n={users.length} unit="사용자" />
      <ul className={`${card} divide-y divide-line-alt`}>
        {users.map((u) => {
          const badge = badges.get(u.id);
          return (
            <li key={u.id}>
              <Link
                href={`/users/${u.id}`}
                className="group flex items-center gap-2 px-5 py-4"
              >
                <TierMark tier={tiers.get(u.id) ?? "newbie"} />
                {badge && (
                  <BadgeIcon
                    badgeKey={badge.key}
                    level={badge.level}
                    size={18}
                  />
                )}
                <span className="min-w-0 truncate t-body-2 !font-semibold text-label group-hover:text-primary">
                  <Highlight text={u.nickname} q={q} />
                </span>
                <span className="ml-auto shrink-0 t-caption-1 text-label-alt">
                  프로필 보기
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

type CommentRow = {
  id: string;
  question_id: string;
  question_title: string;
  user_id: string;
  nickname: string | null;
  body: string;
  created_at: string;
};

// 댓글 검색은 본문만 보여준다. 작성자의 예측(진영)은 표시하지 않는다 (여론 공개 규칙)
async function CommentResults({ q }: { q: string }) {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("search_comments", {
    p_q: q,
    p_limit: 30,
  });
  const comments = (data ?? []) as CommentRow[];
  if (!comments.length) return <EmptyState message="찾는 댓글이 없어요." />;
  const tiers = await getTiers(
    supabase,
    comments.map((c) => c.user_id),
  );

  return (
    <>
      <ResultCount n={comments.length} unit="댓글" />
      <ul className={`${card} divide-y divide-line-alt`}>
        {comments.map((c) => (
          <li key={c.id}>
            <Link
              href={`/questions/${c.question_id}`}
              className="group block px-5 py-4"
            >
              <p className="line-clamp-1 t-caption-1 !font-semibold text-label-alt group-hover:text-primary">
                {c.question_title}
              </p>
              <p className="mt-1 line-clamp-3 whitespace-pre-line t-body-2 text-label">
                <Highlight text={c.body} q={q} />
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 t-caption-1 text-label-alt">
                <TierMark tier={tiers.get(c.user_id) ?? "newbie"} />
                <span>{c.nickname ?? "알 수 없음"}</span>
                <span>· {formatDate(c.created_at)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
