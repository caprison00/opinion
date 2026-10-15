"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import type { Issue } from "@/lib/board";
import { createIssue, updateIssue, type AdminActionState } from "./actions";

const labelClass = "t-label-1 !font-semibold text-label-neutral";

// issue가 있으면 수정, 없으면 새로 만들기
export default function IssueForm({ issue }: { issue?: Issue }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(issue ? updateIssue : createIssue, {});

  useEffect(() => {
    if (state.ok && !issue) formRef.current?.reset();
  }, [state, issue]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {issue && <input type="hidden" name="id" value={issue.id} />}
      <label className="flex flex-col gap-2">
        <span className={labelClass}>이슈 이름 *</span>
        <input
          name="title"
          required
          maxLength={80}
          defaultValue={issue?.title}
          placeholder="예: 2026 롤드컵"
          className={input}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 ${labelClass}`}>3줄 맥락</legend>
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            name="context"
            maxLength={100}
            defaultValue={issue?.context_lines[i] ?? ""}
            placeholder={`${i + 1}번째 줄`}
            className={input}
          />
        ))}
        <span className="t-caption-1 text-label-alt">
          처음 보는 사람도 이해할 수 있게 사실 위주로 짧게 써 주세요.
        </span>
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className={labelClass}>맥락 출처 링크</span>
        <input
          name="source_url"
          type="url"
          defaultValue={issue?.context_source_url ?? ""}
          placeholder="https://"
          className={input}
        />
      </label>

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          {issue
            ? "저장했어요."
            : "이슈가 등록됐어요. 질문을 만들 때 고를 수 있어요."}
        </p>
      )}
      <button
        disabled={pending}
        className={`${issue ? button.smallPrimary : button.primary} ${issue ? "self-start" : "w-full"}`}
      >
        {pending ? "저장 중…" : issue ? "수정 저장" : "이슈 등록"}
      </button>
    </form>
  );
}
