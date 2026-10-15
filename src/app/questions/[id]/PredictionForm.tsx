"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import {
  CONFIDENCE_LEVELS,
  OX_QUICK_P,
  stanceOf,
  type Confidence,
  type QuestionType,
} from "@/lib/questions";
import { savePrediction, type PredictionState } from "./actions";

export default function PredictionForm({
  questionId,
  type,
  options,
  myProbs,
  canWriteReason,
}: {
  questionId: string;
  type: QuestionType;
  options: string[];
  myProbs: number[] | null;
  canWriteReason: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    PredictionState,
    FormData
  >(savePrediction, {});

  return (
    <div className="flex flex-col gap-4">
      {type === "ox" ? (
        <OxForm
          questionId={questionId}
          options={options}
          myProbs={myProbs}
          canWriteReason={canWriteReason}
          formAction={formAction}
          pending={pending}
        />
      ) : (
        <ChoiceForm
          questionId={questionId}
          options={options}
          myProbs={myProbs}
          canWriteReason={canWriteReason}
          formAction={formAction}
          pending={pending}
        />
      )}
      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.savedAt && !state.error && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          예측을 저장했어요.
        </p>
      )}
    </div>
  );
}

type FormProps = {
  questionId: string;
  options: string[];
  myProbs: number[] | null;
  canWriteReason: boolean;
  formAction: (formData: FormData) => void;
  pending: boolean;
};

// OX: 예/아니오를 한 번 누르면 고른 쪽 70%로 바로 저장. 이후 슬라이더로 51~99% 조절.
function OxForm({
  questionId,
  options,
  myProbs,
  canWriteReason,
  formAction,
  pending,
}: FormProps) {
  const mine = myProbs ? stanceOf(myProbs, options) : null;
  const [side, setSide] = useState(mine?.index ?? 0);
  const [percent, setPercent] = useState(mine?.pct ?? OX_QUICK_P * 100);

  // 저장 후 서버에서 받은 내 예측으로 맞춘다.
  useEffect(() => {
    if (mine) {
      setSide(mine.index);
      setPercent(mine.pct);
    }
  }, [mine?.index, mine?.pct]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mine) {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="question_id" value={questionId} />
        <p className="t-label-1 text-label-neutral">
          어떻게 될 것 같나요? 누르면 바로 저장돼요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((label, i) => (
            <button
              key={label}
              name="choice"
              value={i}
              disabled={pending}
              className={`h-14 rounded-xl border t-body-1 !font-bold transition-colors disabled:opacity-50 ${
                i === 0
                  ? "border-positive/40 bg-accent-green text-positive hover:border-positive"
                  : "border-negative/40 bg-accent-red text-negative-strong hover:border-negative"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="t-caption-1 text-label-alt">
          고른 쪽 {OX_QUICK_P * 100}%로 저장되고, 다음에 확률을 조절할 수
          있어요.
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="question_id" value={questionId} />
      <input type="hidden" name="choice" value={side} />
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-label="고른 쪽"
      >
        {options.map((label, i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={side === i}
            onClick={() => setSide(i)}
            className={`h-11 rounded-xl border t-body-2 !font-semibold transition-colors ${
              side === i
                ? "border-inverse bg-inverse text-on-inverse"
                : "border-line-neutral text-label-neutral hover:bg-fill-alt"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        <div className="flex items-end justify-between">
          <label htmlFor="percent" className="t-label-1 text-label-neutral">
            &lsquo;{options[side]}&rsquo;일 확률
          </label>
          <span className="t-title-1 tabular-nums text-label">{percent}%</span>
        </div>
        <input
          id="percent"
          type="range"
          name="percent"
          min={51}
          max={99}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="probability-slider mt-4 w-full"
          style={
            {
              "--value": `${((percent - 51) / 48) * 100}%`,
            } as React.CSSProperties
          }
        />
        <div className="mt-2 flex justify-between t-caption-1 text-label-alt">
          <span>조금 더 그럴 듯</span>
          <span>거의 확실</span>
        </div>
      </div>
      {canWriteReason && <ReasonInput />}
      <button disabled={pending} className={`${button.primary} w-full`}>
        {pending ? "저장 중…" : "예측 수정"}
      </button>
    </form>
  );
}

// 객관식: 하나를 고르고 확신도(낮음 50 / 보통 70 / 높음 90)를 고른다.
function ChoiceForm({
  questionId,
  options,
  myProbs,
  canWriteReason,
  formAction,
  pending,
}: FormProps) {
  const mine = myProbs ? stanceOf(myProbs, options) : null;
  const [choice, setChoice] = useState<number | null>(mine?.index ?? null);
  const [confidence, setConfidence] = useState<Confidence>(
    CONFIDENCE_LEVELS.find((c) => Math.round(c.p * 100) === mine?.pct)?.value ??
      "mid",
  );
  const level = CONFIDENCE_LEVELS.find((c) => c.value === confidence)!;
  const restPct =
    Math.round(((1 - level.p) / (options.length - 1)) * 1000) / 10;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="question_id" value={questionId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 t-label-1 text-label-neutral">
          가장 유력한 답을 골라 주세요
        </legend>
        {options.map((label, i) => (
          <label
            key={label}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line-neutral px-4 py-3 t-body-2 transition-colors hover:bg-fill-alt has-[:checked]:border-primary has-[:checked]:bg-accent-blue"
          >
            <input
              type="radio"
              name="choice"
              value={i}
              checked={choice === i}
              onChange={() => setChoice(i)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="!font-semibold">{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 t-label-1 text-label-neutral">
          얼마나 확신하나요?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {CONFIDENCE_LEVELS.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer flex-col items-center rounded-xl border border-line-neutral py-2.5 transition-colors hover:bg-fill-alt has-[:checked]:border-inverse has-[:checked]:bg-inverse has-[:checked]:text-on-inverse"
            >
              <input
                type="radio"
                name="confidence"
                value={c.value}
                checked={confidence === c.value}
                onChange={() => setConfidence(c.value)}
                className="sr-only"
              />
              <span className="t-body-3 !font-semibold">{c.label}</span>
              <span className="t-caption-1 opacity-70">
                {Math.round(c.p * 100)}%
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 t-caption-1 text-label-alt">
          {choice === null
            ? "답을 고르면 확률이 이렇게 나뉘어요."
            : `‘${options[choice]}’ ${Math.round(level.p * 100)}%, 나머지 각 ${restPct}%`}
        </p>
      </fieldset>

      {canWriteReason && <ReasonInput />}
      <button
        disabled={pending || choice === null}
        className={`${button.primary} w-full`}
      >
        {pending ? "저장 중…" : mine ? "예측 수정" : "예측 저장"}
      </button>
    </form>
  );
}

function ReasonInput() {
  return (
    <label className="flex flex-col gap-2">
      <span className="t-label-1 text-label-neutral">한 줄 근거 (선택)</span>
      <input
        name="reason"
        maxLength={100}
        placeholder="왜 그렇게 생각하나요?"
        className={input}
      />
      <span className="t-caption-1 text-label-alt">
        토론에 내 첫 댓글로 공개돼요.
      </span>
    </label>
  );
}
