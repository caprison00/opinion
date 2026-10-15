import Link from "next/link";
import { changeOf, type Board } from "@/lib/board";
import {
  categoryLabel,
  formatDate,
  stanceOf,
  timeLeft,
  type Question,
} from "@/lib/questions";
import { Change, Locked } from "./CrowdBits";
import { card } from "./ui";

export default function QuestionCard({
  question,
  board,
}: {
  question: Question;
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

  return (
    <Link
      href={`/questions/${question.id}`}
      className={`${card} group flex flex-col p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-medium`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-fill px-2 py-0.5 t-caption-1 !font-semibold text-label-neutral">
            {categoryLabel(question.category)}
          </span>
          {question.type === "choice" && (
            <span className="rounded-md bg-accent-blue px-2 py-0.5 t-caption-1 !font-semibold text-primary">
              객관식 {question.options.length}
            </span>
          )}
        </div>
        <span className="t-caption-1 !font-semibold text-caution-text">
          {timeLeft(question.close_at)}
        </span>
      </div>

      <h2 className="mt-3 line-clamp-2 t-body-1 !font-bold text-label">
        {question.title}
      </h2>

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-2">
          <span className="t-caption-1 text-label-alt">집단 확률</span>
          {shown ? (
            <span className="flex min-w-0 items-baseline gap-1.5">
              <Change value={changeOf(board, shown.index)} />
              <span className="min-w-0 truncate t-heading-2 text-primary">
                <span className="t-label-1 !font-semibold">{shown.label} </span>
                <span className="tabular-nums">{shown.pct}%</span>
              </span>
            </span>
          ) : (
            <Locked />
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-strong">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${shown?.pct ?? 0}%` }}
          />
        </div>
        <p className="mt-3 t-caption-1 text-label-alt">
          마감 {formatDate(question.close_at)} · {board.participants}명 예측
        </p>
      </div>
    </Link>
  );
}
