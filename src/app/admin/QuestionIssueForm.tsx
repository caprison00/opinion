"use client";

import { useActionState, useEffect, useState } from "react";
import { button, input } from "@/components/ui";
import { setQuestionIssue, type AdminActionState } from "./actions";

// 질문 관리: 질문을 이슈 묶음에 넣거나 뺀다. 저장 결과를 버튼 옆에 보여준다.
export default function QuestionIssueForm({
  id,
  issueId,
  issues,
}: {
  id: string;
  issueId: string | null;
  issues: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setQuestionIssue,
    {},
  );
  const [shown, setShown] = useState<AdminActionState>({});

  // "저장했어요"는 잠깐 보였다가 사라진다
  useEffect(() => {
    setShown(state);
    if (!state.ok) return;
    const t = setTimeout(() => setShown({}), 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="issue_id"
        defaultValue={issueId ?? ""}
        aria-label="이슈 묶음"
        onChange={() => setShown({})}
        className={`${input} !w-auto min-w-0 !py-1.5 t-label-2`}
      >
        <option value="">이슈 없음</option>
        {issues.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
          </option>
        ))}
      </select>
      <button
        disabled={pending}
        className={`${button.smallSecondary} shrink-0`}
      >
        {pending ? "저장 중…" : "이슈 저장"}
      </button>
      <span aria-live="polite" className="t-label-2 !font-semibold">
        {shown.ok && <span className="text-positive">저장했어요</span>}
        {shown.error && (
          <span className="text-negative-strong">{shown.error}</span>
        )}
      </span>
    </form>
  );
}
