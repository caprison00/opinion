import Link from "next/link";
import { changeOf, type Board } from "@/lib/board";
import {
  categoryLabel,
  formatDate,
  isAccepting,
  outcomeLabel,
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
    isAccepting(question) &&
    Date.now() - new Date(question.open_at).getTime() < 48 * 3_600_000;

  const isOx = question.type === "ox";
  // 마감·판정된 질문 (전체 질문 목록의 '마감·판정' 탭): 오른쪽 위는 판정/마감/무효
  const accepting = isAccepting(question);
  const left = accepting
    ? dDay(question.close_at)
    : question.status === "resolved"
      ? "판정"
      : question.status === "void"
        ? "무효"
        : "마감";
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
        <span
          className={`num-s shrink-0 ${soon ? "text-caution" : "text-label"}`}
        >
          {left}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <h2 className="line-clamp-2 min-w-0 flex-1 t-body-1 !font-extrabold text-label group-hover:text-primary">
          {question.title}
        </h2>
        {image && (
          <Thumb image={image} className="h-[60px] w-[60px] rounded-xl" />
        )}
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
        {!accepting && <DoneLine question={question} board={board} />}
        <p className="flex items-center justify-between gap-2 t-caption-1 text-label-alt">
          <span>마감 {formatDate(question.close_at)}</span>
          <Participants n={board.participants} />
        </p>
      </div>
    </Link>
  );
}

// 마감·판정된 질문의 결과 줄: 판정됨(결과 + 적중 비율) / 판정 대기 / 무효
function DoneLine({ question, board }: { question: Question; board: Board }) {
  if (question.status === "void") {
    return (
      <p className="t-label-2">
        <span className="rounded-lg bg-fill px-2.5 py-1 !font-bold text-label-neutral">
          무효 처리
        </span>
      </p>
    );
  }
  if (question.status === "resolved") {
    const isNo = question.type === "ox" && question.outcome_index === 1;
    const rate =
      board.hitRate === null ? null : Math.round(board.hitRate * 100);
    return (
      <p className="flex items-center justify-between gap-2 t-label-2">
        <span
          className={`rounded-lg px-2.5 py-1 !font-extrabold ${
            isNo ? "bg-no-soft text-no-ink" : "bg-yes-soft text-yes-ink"
          }`}
        >
          결과 {outcomeLabel(question)}
        </span>
        <span className="text-label-neutral">
          {board.participants === 0 || rate === null
            ? "예측한 사람이 없었어요"
            : rate < 50
              ? `단 ${rate}%만 맞혔어요`
              : `${rate}%가 맞혔어요`}
        </span>
      </p>
    );
  }
  return (
    <p className="flex items-center justify-between gap-2 t-label-2">
      <span className="rounded-lg bg-fill px-2.5 py-1 !font-bold text-label-neutral">
        판정 대기
      </span>
      <span className="text-label-neutral">
        {formatDate(question.resolve_at)} 판정 예정
      </span>
    </p>
  );
}
