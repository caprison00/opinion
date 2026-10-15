"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import Link from "next/link";
import {
  CATEGORIES,
  CHOICE_MAX,
  CHOICE_MIN,
  type Question,
} from "@/lib/questions";
import {
  createQuestion,
  updatePrivateQuestion,
  type CreateQuestionState,
} from "./actions";
import ImageField from "./ImageField";

// ISO 시각 → <input type="datetime-local"> 값 (한국 시간)
function toKstInput(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

const labelClass = "t-label-1 !font-semibold text-label-neutral";

// question이 있으면 비공개 질문 수정, 없으면 새 질문(비공개로 저장)
export default function QuestionForm({
  issues,
  question,
}: {
  issues: { id: string; title: string }[];
  question?: Question;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"ox" | "choice">(question?.type ?? "ox");
  const [optionCount, setOptionCount] = useState(
    question?.type === "choice" ? question.options.length : CHOICE_MIN,
  );
  const [state, formAction, pending] = useActionState<
    CreateQuestionState,
    FormData
  >(question ? updatePrivateQuestion : createQuestion, {});

  useEffect(() => {
    if (state.ok && !question) {
      formRef.current?.reset();
      setType("ox");
      setOptionCount(CHOICE_MIN);
    }
  }, [state, question]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {question && <input type="hidden" name="id" value={question.id} />}
      <label className="flex flex-col gap-2">
        <span className={labelClass}>질문 제목 *</span>
        <input
          name="title"
          required
          defaultValue={question?.title}
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
          defaultValue={question?.description}
          rows={3}
          placeholder="판정 기준을 구체적으로 적어 주세요."
          className={input}
        />
      </label>

      <ImageField
        value={question}
        hint="직접 만들었거나 사용이 허락된 사진만 올려 주세요(뉴스·연예인·중계 화면 사진은 안 돼요). 결과를 암시하는 사진도 피해 주세요. 비워두면 이슈 묶음의 사진을 써요."
      />

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
              defaultValue={
                question?.type === "choice" ? question.options[i] : undefined
              }
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
                defaultChecked={
                  question ? question.category === c.value : i === 0
                }
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>이슈 묶음</span>
        <select
          name="issue_id"
          defaultValue={question?.issue_id ?? ""}
          className={input}
        >
          <option value="">없음</option>
          {issues.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
        <span className="t-caption-1 text-label-alt">
          홈의 &lsquo;오늘의 핫이슈&rsquo;에 이슈 단위로 묶여 보여요.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>판정 출처 *</span>
        <input
          name="resolution_source"
          defaultValue={question?.resolution_source}
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
            defaultValue={question ? toKstInput(question.close_at) : undefined}
            required
            className={input}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>결과 확정 예정 *</span>
          <input
            type="datetime-local"
            name="resolve_at"
            defaultValue={
              question ? toKstInput(question.resolve_at) : undefined
            }
            required
            className={input}
          />
        </label>
      </div>

      <p className="rounded-lg bg-accent-orange px-3 py-2.5 t-caption-1 text-caution-text">
        국내 공직선거·정당 지지도 관련 질문은 만들 수 없어요. 연예·아이돌 질문은
        시청률·차트·음반 판매량처럼 공식 기록으로 판정할 수 있는 것만 다루고,
        열애·사생활·소문은 피해 주세요. 직장·커리어, 음식·맛집 질문도 특정
        회사·가게·개인을 깎아내리는 내용은 만들지 않아요.
      </p>

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          {question ? (
            "저장했어요."
          ) : (
            <span>
              비공개로 저장됐어요.{" "}
              <Link href="/admin?tab=private" className="underline">
                비공개 질문
              </Link>
              에서 확인한 뒤 공개해 주세요.
            </span>
          )}
        </p>
      )}

      <button disabled={pending} className={`${button.primary} w-full`}>
        {pending ? "저장 중…" : question ? "수정 저장" : "비공개로 저장"}
      </button>
    </form>
  );
}
