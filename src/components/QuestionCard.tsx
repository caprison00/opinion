import Link from "next/link";
import { changeOf, type Board } from "@/lib/board";
import {
  categoryLabel,
  formatDate,
  stanceOf,
  dDay,
  type Question,
} from "@/lib/questions";
import {
  Change,
  Locked,
  LockedScale,
  Participants,
  ProbScale,
} from "./CrowdBits";
import { card } from "./ui";
import type { PickedImage } from "@/lib/images";
import { Thumb } from "./QuestionImage";

export default function QuestionCard({
  question,
  board,
  image,
}: {
  question: Question;
  image?: PickedImage | null;
  board: Board; // crowd가 null이면 가린다 (여론 공개 규칙)
}) {
  const crowd = board.crowd;
  // OX는 '예'의 확률, 객관식은 가장 높은 선택지를 보여준다.
  const shown = crowd
    ? question.type === "ox"
      ? {
          index: 0,
          label: question.options[0],
          pct: Math.round(crowd[0] * 100),
        }
      : stanceOf(crowd, question.options)
    : null;

  // 공개된 지 48시간이 안 된 질문
  const isNew =
    question.status === "open" &&
    Date.now() - new Date(question.open_at).getTime() < 48 * 3_600_000;

  const isOx = question.type === "ox";
  const left = dDay(question.close_at);
  // 마감 3일 이하(D-day 포함)는 주의 색
  const soon = left === "D-day" || /^D-[0-3]$/.test(left);

  return (
    <Link
      href={`/questions/${question.id}`}
      className={`${card} group flex flex-col gap-3.5 p-5 transition duration-150 hover:shadow-small`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-bg-alt px-2 py-0.5 t-caption-1 !font-semibold text-label-neutral">
            {categoryLabel(question.category)}
          </span>
          {isNew && (
            <span className="rounded-md bg-yes px-2 py-0.5 t-caption-1 !font-bold text-white">
              새 질문
            </span>
          )}
          {question.type === "choice" && (
            <span className="rounded-md bg-yes-soft px-2 py-0.5 t-caption-1 !font-bold text-yes-ink">
              객관식 {question.options.length}
            </span>
          )}
        </div>
        <span className={`num-s shrink-0 ${soon ? "text-caution" : "text-label"}`}>
          {left}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <h2 className="line-clamp-2 min-w-0 flex-1 t-body-1 !font-extrabold text-label group-hover:text-primary">
          {question.title}
        </h2>
        {image && <Thumb image={image} className="h-[60px] w-[60px] rounded-xl" />}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {shown ? (
          <>
            <div className="flex items-baseline justify-between gap-2 t-label-2 !font-bold">
              {isOx ? (
                <span className="text-no-ink">
                  {question.options[1]} {100 - shown.pct}%
                </span>
              ) : (
                <span className="min-w-0 truncate text-label-neutral">
                  1위 {shown.label}
                </span>
              )}
              <span className="flex shrink-0 items-baseline gap-1.5">
                <Change value={changeOf(board, shown.index)} />
                <span className={isOx ? "text-yes-ink" : "text-primary"}>
                  {isOx && `${question.options[0]} `}
                  <span className="num-m">{shown.pct}%</span>
                </span>
              </span>
            </div>
            {isOx ? (
              <ProbScale value={shown.pct} />
            ) : (
              <div className="h-2 overflow-hidden rounded-full bg-fill-strong">
                <div
                  className="h-full rounded-full bg-yes"
                  style={{ width: `${shown.pct}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 t-label-2 text-label-neutral">
              <span>모두의 예감</span>
              <Locked />
            </div>
            <LockedScale />
          </>
        )}
        <p className="flex items-center justify-between gap-2 t-caption-1 text-label-alt">
          <span>마감 {formatDate(question.close_at)}</span>
          <Participants n={board.participants} />
        </p>
      </div>
    </Link>
  );
}
