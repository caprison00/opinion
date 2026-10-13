"use client";

import { useActionState, useEffect, useRef } from "react";
import { CATEGORIES } from "@/lib/questions";
import { createQuestion, type CreateQuestionState } from "./actions";

const inputClass =
  "w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900";

export default function QuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    CreateQuestionState,
    FormData
  >(createQuestion, {});

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">질문 제목 *</span>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="예: 손흥민이 이번 시즌 리그 10골 이상을 넣을까?"
          className={inputClass}
        />
        <span className="text-xs text-gray-400">
          예/아니오로 답할 수 있게 써 주세요.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">설명</span>
        <textarea
          name="description"
          rows={3}
          placeholder="판정 기준을 구체적으로 적어 주세요."
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1 font-medium">카테고리 *</legend>
        <div className="flex gap-2">
          {CATEGORIES.map((c, i) => (
            <label
              key={c.value}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="category"
                value={c.value}
                defaultChecked={i === 0}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">판정 출처 *</span>
        <input
          name="resolution_source"
          required
          placeholder="예: 프리미어리그 공식 홈페이지 기록"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">예측 마감 (한국 시간) *</span>
          <input
            type="datetime-local"
            name="close_at"
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">결과 확정 예정 *</span>
          <input
            type="datetime-local"
            name="resolve_at"
            required
            className={inputClass}
          />
        </label>
      </div>

      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        국내 공직선거·정당 지지도 관련 질문은 만들 수 없어요.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-green-700">질문이 등록됐어요!</p>
      )}

      <button
        disabled={pending}
        className="rounded-xl bg-gray-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "등록 중…" : "질문 등록"}
      </button>
    </form>
  );
}
