import Link from "next/link";
import {
  categoryLabel,
  formatDate,
  timeLeft,
  type Question,
} from "@/lib/questions";

export default function QuestionCard({ question }: { question: Question }) {
  return (
    <Link
      href={`/questions/${question.id}`}
      className="block rounded-2xl border border-gray-200 p-4 active:bg-gray-50"
    >
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5">
          {categoryLabel(question.category)}
        </span>
        <span className="font-medium text-orange-600">
          {timeLeft(question.close_at)}
        </span>
      </div>
      <h2 className="mt-2 font-semibold leading-snug">{question.title}</h2>
      <p className="mt-1 text-xs text-gray-400">
        마감 {formatDate(question.close_at)}
      </p>
    </Link>
  );
}
