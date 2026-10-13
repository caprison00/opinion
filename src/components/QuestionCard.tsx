import Link from "next/link";
import {
  categoryLabel,
  formatDate,
  timeLeft,
  type Question,
} from "@/lib/questions";
import { card } from "./ui";

export default function QuestionCard({
  question,
  crowd,
  count = 0,
}: {
  question: Question;
  crowd?: number;
  count?: number;
}) {
  return (
    <Link
      href={`/questions/${question.id}`}
      className={`${card} group flex flex-col p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-medium`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-fill px-2 py-0.5 t-caption-1 !font-semibold text-label-neutral">
          {categoryLabel(question.category)}
        </span>
        <span className="t-caption-1 !font-semibold text-caution-text">
          {timeLeft(question.close_at)}
        </span>
      </div>

      <h2 className="mt-3 line-clamp-2 t-body-1 !font-bold text-label">
        {question.title}
      </h2>

      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between">
          <span className="t-caption-1 text-label-alt">집단 확률</span>
          <span
            className={`t-heading-2 tabular-nums ${
              crowd === undefined ? "text-label-assist" : "text-primary"
            }`}
          >
            {crowd === undefined ? "–" : `${crowd}%`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-strong">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${crowd ?? 0}%` }}
          />
        </div>
        <p className="mt-3 t-caption-1 text-label-alt">
          마감 {formatDate(question.close_at)} · {count}명 예측
        </p>
      </div>
    </Link>
  );
}
