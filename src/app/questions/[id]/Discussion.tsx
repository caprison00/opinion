"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { button, card, chip, input } from "@/components/ui";
import {
  COMMENT_MAX,
  REACTIONS,
  timeAgo,
  type ReactionKind,
} from "@/lib/discussion";
import { stanceOf } from "@/lib/questions";
import type { Tier } from "@/lib/tiers";
import TierMark from "@/components/TierMark";
import { LockIcon } from "@/components/icons";
import BadgeIcon from "@/components/BadgeIcon";
import type { FeaturedBadge } from "@/lib/badges";
import {
  addComment,
  deleteComment,
  react,
  reportComment,
} from "./discussion-actions";

export type DiscussionComment = {
  id: string;
  userId: string;
  nickname: string;
  tier: Tier; // 작성자의 이번 시즌 티어
  badge: FeaturedBadge | null; // 작성자가 고른 대표 뱃지
  body: string;
  createdAt: string;
  parentId: string | null;
  reactions: Record<ReactionKind, number>;
  myReaction: ReactionKind | null;
  authorScore: number; // 작성자 누적 점수 (고득점자순 정렬)
  stance: number[] | null; // 볼 수 있을 때만 (여론 공개 규칙)
};

type Sort = "reaction" | "score" | "latest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "reaction", label: "공감순" },
  { value: "score", label: "고득점자순" },
  { value: "latest", label: "최신순" },
];

export default function Discussion({
  questionId,
  comments,
  options,
  outcomeIndex,
  viewerId,
  locked,
}: {
  questionId: string;
  comments: DiscussionComment[];
  options: string[];
  outcomeIndex: number | null;
  viewerId: string | null;
  locked: boolean; // 내가 아직 예측하지 않은 진행 중 질문
}) {
  const [sort, setSort] = useState<Sort>("reaction");
  const [side, setSide] = useState<number | null>(null);

  const { roots, replies } = useMemo(() => {
    const replies = new Map<string, DiscussionComment[]>();
    for (const c of comments) {
      if (c.parentId) {
        replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c]);
      }
    }
    for (const list of replies.values()) {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    const total = (c: DiscussionComment) =>
      c.reactions.confident + c.reactions.anxious + c.reactions.absurd;
    const roots = comments
      .filter((c) => !c.parentId)
      .filter(
        (c) =>
          side === null ||
          (c.stance && stanceOf(c.stance, options).index === side),
      )
      .sort((a, b) => {
        if (sort === "reaction" && total(b) !== total(a))
          return total(b) - total(a);
        if (sort === "score" && b.authorScore !== a.authorScore) {
          return b.authorScore - a.authorScore;
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
    return { roots, replies };
  }, [comments, sort, side, options]);

  return (
    <section>
      <h2 className="flex items-baseline gap-2 t-heading-2 lg:t-heading-1">
        토론{" "}
        <span className="num text-[0.9em] text-label-alt">
          {comments.length}
        </span>
      </h2>

      {viewerId ? (
        <Composer questionId={questionId} parentId={null} />
      ) : (
        <Link
          href="/login"
          className="mt-3.5 block rounded-[14px] bg-bg-alt px-4 py-3.5 t-label-1 !font-semibold text-label-neutral hover:text-label"
        >
          로그인하고 토론에 참여하기
        </Link>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSort(s.value)}
            className={`${chip(sort === s.value)} !h-9 !px-3.5`}
          >
            {s.label}
          </button>
        ))}
        {!locked && (
          <>
            <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setSide(null)}
              className={`${chip(side === null)} !h-9 !px-3.5`}
            >
              전체
            </button>
            {options.map((o, i) => (
              <button
                key={o}
                type="button"
                onClick={() => setSide(i)}
                className={`${chip(side === i)} !h-9 !px-3.5`}
              >
                {o} 진영
              </button>
            ))}
          </>
        )}
      </div>
      {locked && comments.length > 0 && (
        <p className="mt-2 t-caption-1 text-label-alt">
          작성자가 어느 쪽을 예측했는지는 내가 참여하면 보여요.
        </p>
      )}

      {roots.length === 0 ? (
        <p className="mt-4 rounded-[18px] bg-bg-alt py-10 text-center t-label-1 text-label-alt">
          {comments.length === 0
            ? "아직 의견이 없어요. 첫 의견을 남겨 보세요."
            : "이 진영의 의견이 아직 없어요."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {roots.map((c) => (
            <li key={c.id} className={`${card} p-4 md:p-5`}>
              <CommentItem
                c={c}
                questionId={questionId}
                options={options}
                outcomeIndex={outcomeIndex}
                viewerId={viewerId}
                canReply={!!viewerId}
                locked={locked}
              />
              {(replies.get(c.id) ?? []).length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 md:ml-1">
                  {replies.get(c.id)!.map((r) => (
                    <li key={r.id} className="rounded-xl bg-bg-alt p-3 md:px-4">
                      <CommentItem
                        c={r}
                        questionId={questionId}
                        options={options}
                        outcomeIndex={outcomeIndex}
                        viewerId={viewerId}
                        canReply={false}
                        locked={locked}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  c,
  questionId,
  options,
  outcomeIndex,
  viewerId,
  canReply,
  locked = false,
  compact = false,
}: {
  c: DiscussionComment;
  questionId: string;
  options: string[];
  outcomeIndex: number | null;
  viewerId: string | null;
  canReply: boolean;
  locked?: boolean; // 보는 사람이 아직 예측 전이면 작성자 진영을 가린다
  compact?: boolean; // 답글 (회색 상자 안)
}) {
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mine = viewerId === c.userId;
  const stance = c.stance ? stanceOf(c.stance, options) : null;
  const hit =
    stance && outcomeIndex !== null ? stance.index === outcomeIndex : null;

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      {/* 머리줄: 티어·뱃지·닉네임·시간 / 오른쪽 진영·적중 */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Link
          href={`/users/${c.userId}`}
          className={`inline-flex min-w-0 items-center gap-1.5 !font-extrabold text-label hover:underline ${
            compact ? "t-label-2" : "t-label-1"
          }`}
        >
          <TierMark tier={c.tier} />
          {c.badge && (
            <BadgeIcon badgeKey={c.badge.key} level={c.badge.level} size={16} />
          )}
          <span className="truncate">{c.nickname}</span>
          {mine && <span className="!font-semibold text-label-alt">(나)</span>}
        </Link>
        <span className="t-caption-1 text-label-alt">
          {timeAgo(c.createdAt)}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {hit !== null && (
            <span
              className={`rounded-md px-2 py-0.5 t-caption-1 !font-bold ${
                hit ? "bg-yes-soft text-yes-ink" : "bg-fill text-label-alt"
              }`}
            >
              {hit ? "적중" : "빗나감"}
            </span>
          )}
          {stance ? (
            <span
              className={`inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 t-label-2 !font-extrabold ${
                options.length === 2 && stance.index === 1
                  ? "bg-no text-on-no"
                  : "bg-yes text-white"
              }`}
            >
              {stance.label} {stance.pct}%
            </span>
          ) : (
            locked && (
              <span className="inline-flex items-center gap-1 t-caption-1 !font-semibold text-label-alt">
                <LockIcon className="h-3 w-3" />
                진영은 예측 후 공개
              </span>
            )
          )}
        </span>
      </div>
      <p
        className={`mt-2 whitespace-pre-line break-words text-label ${
          compact ? "t-label-1 !font-normal" : "t-body-3"
        }`}
      >
        {c.body}
      </p>

      <div
        className={`flex flex-wrap items-center gap-1 ${
          compact ? "mt-1.5" : "mt-3 border-t border-line-alt pt-2"
        }`}
      >
        {REACTIONS.map((r) => {
          const active = c.myReaction === r.value;
          return (
            <button
              key={r.value}
              type="button"
              disabled={!viewerId || pending}
              onClick={() =>
                run(() => react(questionId, c.id, r.value, c.myReaction))
              }
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 t-label-2 !font-bold transition-colors disabled:cursor-default ${
                active
                  ? "bg-yes-soft text-yes-ink"
                  : "text-label-neutral enabled:hover:bg-fill"
              }`}
            >
              {r.label}
              <span className="num text-[13px]">{c.reactions[r.value]}</span>
            </button>
          );
        })}
        <span className="flex-1" />
        {canReply && (
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="inline-flex h-9 items-center rounded-lg px-2.5 t-label-2 !font-bold text-label-neutral hover:bg-fill"
          >
            답글
          </button>
        )}
        {viewerId && !mine && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const reason = prompt(
                "신고 사유를 적어 주세요 (선택). 신고가 쌓이면 자동으로 숨겨져요.",
              );
              if (reason !== null)
                run(() => reportComment(questionId, c.id, reason));
            }}
            className="inline-flex h-9 items-center rounded-lg px-2.5 t-caption-1 text-label-alt hover:bg-fill"
          >
            신고
          </button>
        )}
        {mine && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("이 댓글을 지울까요?")) {
                run(() => deleteComment(questionId, c.id));
              }
            }}
            className="inline-flex h-9 items-center rounded-lg px-2.5 t-caption-1 text-label-alt hover:bg-fill"
          >
            삭제
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 t-caption-1 text-negative-strong">{error}</p>
      )}
      {replying && (
        <div className="mt-2">
          <Composer
            questionId={questionId}
            parentId={c.id}
            onDone={() => setReplying(false)}
          />
        </div>
      )}
    </div>
  );
}

function Composer({
  questionId,
  parentId,
  onDone,
}: {
  questionId: string;
  parentId: string | null;
  onDone?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addComment(questionId, text, parentId);
          if (res.error) {
            setError(res.error);
          } else {
            setText("");
            onDone?.();
          }
        });
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={COMMENT_MAX}
        rows={parentId ? 2 : 3}
        placeholder={
          parentId ? "답글을 남겨 보세요" : "이 질문에 대한 생각을 남겨 보세요"
        }
        className={`${input} resize-y`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="t-caption-1 text-label-assist">
          {text.length}/{COMMENT_MAX} · 욕설, 정당·선거, 외부 연락처는 쓸 수
          없어요
        </span>
        <button
          disabled={pending || !text.trim()}
          className={button.smallPrimary}
        >
          {pending ? "등록 중…" : parentId ? "답글 등록" : "등록"}
        </button>
      </div>
      {error && <p className="t-caption-1 text-negative-strong">{error}</p>}
    </form>
  );
}
