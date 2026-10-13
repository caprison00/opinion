import Link from "next/link";
import {
  categoryLabel,
  formatDate,
  timeLeft,
  type Question,
} from "@/lib/questions";

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
      className="block rounded-2xl border border-gray-200 p-4 transition-colors hover:border-gray-300 active:bg-gray-50"
    >
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5">
          {categoryLabel(question.category)}
        </span>
        <span className="font-medium text-orange-600">
          {timeLeft(question.close_at)}
        </span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h2 className="font-semibold leading-snug">{question.title}</h2>
        <span
          className={`shrink-0 text-xl font-bold tabular-nums ${
            crowd === undefined ? "text-gray-300" : "text-indigo-600"
          }`}
        >
          {crowd === undefined ? "–" : `${crowd}%`}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${crowd ?? 0}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        마감 {formatDate(question.close_at)} · {count}명 예측
      </p>
    </Link>
  );
}
