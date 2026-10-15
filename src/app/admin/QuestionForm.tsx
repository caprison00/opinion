"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import { CATEGORIES, CHOICE_MAX, CHOICE_MIN } from "@/lib/questions";
import { createQuestion, type CreateQuestionState } from "./actions";

const labelClass = "t-label-1 !font-semibold text-label-neutral";

export default function QuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"ox" | "choice">("ox");
  const [optionCount, setOptionCount] = useState(CHOICE_MIN);
  const [state, formAction, pending] = useActionState<
    CreateQuestionState,
    FormData
  >(createQuestion, {});

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setType("ox");
      setOptionCount(CHOICE_MIN);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={labelClass}>질문 제목 *</span>
        <input
          name="title"
          required
          maxLength={120}
          placeholder={
            type === "ox"
              ? "예: 손흥민이 이번 시즌 리그 10골 이상을 넣을까?"
              : "예: 올해 롤드컵 우승팀은?"
          }
          className={input}
        />
        <span className="t-caption-1 text-label-alt">
          {type === "ox"
            ? "예/아니오로 답할 수 있게 써 주세요."
            : "선택지 중 하나가 정답이 되도록 써 주세요."}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>설명</span>
        <textarea
          name="description"
          rows={3}
          placeholder="판정 기준을 구체적으로 적어 주세요."
          className={input}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 ${labelClass}`}>질문 유형 *</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "ox", label: "OX", hint: "예 / 아니오" },
            {
              value: "choice",
              label: "객관식",
              hint: `선택지 ${CHOICE_MIN}~${CHOICE_MAX}개`,
            },
          ].map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer flex-col rounded-xl border border-line-neutral px-4 py-2.5 transition-colors has-[:checked]:border-inverse has-[:checked]:bg-inverse has-[:checked]:text-on-inverse"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value as "ox" | "choice")}
                className="sr-only"
              />
              <span className="t-body-3 !font-semibold">{t.label}</span>
              <span className="t-caption-1 opacity-70">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "choice" && (
        <fieldset className="flex flex-col gap-2">
          <legend className={`mb-2 ${labelClass}`}>선택지 *</legend>
          {Array.from({ length: optionCount }, (_, i) => (
            <input
              key={i}
              name="options"
              required
              maxLength={30}
              placeholder={`선택지 ${i + 1}`}
              className={input}
            />
          ))}
          <div className="flex gap-2">
            {optionCount < CHOICE_MAX && (
              <button
                type="button"
                onClick={() => setOptionCount((c) => c + 1)}
                className={button.smallSecondary}
              >
                선택지 추가
              </button>
            )}
            {optionCount > CHOICE_MIN && (
              <button
                type="button"
                onClick={() => setOptionCount((c) => c - 1)}
                className={button.smallSecondary}
              >
                마지막 선택지 빼기
              </button>
            )}
          </div>
          <span className="t-caption-1 text-label-alt">
            정답은 하나만 나오도록, 빠지는 경우가 없게 써 주세요. 필요하면
            &lsquo;기타&rsquo;를 넣어 주세요.
          </span>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 ${labelClass}`}>카테고리 *</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c, i) => (
            <label
              key={c.value}
              className="inline-flex h-[38px] cursor-pointer items-center rounded-full border border-line-neutral px-4 t-label-1 !font-semibold text-label-neutral transition-colors has-[:checked]:border-inverse has-[:checked]:bg-inverse has-[:checked]:text-on-inverse"
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

      <label className="flex flex-col gap-2">
        <span className={labelClass}>판정 출처 *</span>
        <input
          name="resolution_source"
          required
          placeholder="예: 프리미어리그 공식 홈페이지 기록"
          className={input}
        />
      </label>

      <div className="grid grid-cols-1 gap-5">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>예측 마감 (한국 시간) *</span>
          <input
            type="datetime-local"
            name="close_at"
            required
            className={input}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>결과 확정 예정 *</span>
          <input
            type="datetime-local"
            name="resolve_at"
            required
            className={input}
          />
        </label>
      </div>

      <p className="rounded-lg bg-accent-orange px-3 py-2.5 t-caption-1 text-caution-text">
        국내 공직선거·정당 지지도 관련 질문은 만들 수 없어요. 연예·컬처 질문은
        시청률·차트·구독자 수처럼 공식 기록으로 판정할 수 있는 것만 다루고,
        사생활이나 소문은 피해 주세요.
      </p>

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          질문이 등록됐어요.
        </p>
      )}

      <button disabled={pending} className={`${button.primary} w-full`}>
        {pending ? "등록 중…" : "질문 등록"}
      </button>
    </form>
  );
}
