"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import { createIssue, type AdminActionState } from "./actions";

const labelClass = "t-label-1 !font-semibold text-label-neutral";

export default function IssueForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(createIssue, {});

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className={labelClass}>이슈 이름 *</span>
        <input
          name="title"
          required
          maxLength={80}
          placeholder="예: 2026 롤드컵"
          className={input}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 ${labelClass}`}>3줄 맥락</legend>
        {[1, 2, 3].map((n) => (
          <input
            key={n}
            name="context"
            maxLength={100}
            placeholder={`${n}번째 줄`}
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
          이슈가 등록됐어요. 질문을 만들 때 고를 수 있어요.
        </p>
      )}
      <button disabled={pending} className={`${button.secondary} w-full`}>
        {pending ? "등록 중…" : "이슈 등록"}
      </button>
    </form>
  );
}
