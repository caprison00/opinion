"use client";

import { useActionState, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import { savePrediction, type PredictionState } from "./actions";

export default function PredictionForm({
  questionId,
  initialProbability,
  initialReason,
}: {
  questionId: string;
  initialProbability?: number;
  initialReason?: string;
}) {
  const [probability, setProbability] = useState(initialProbability ?? 50);
  const [state, formAction, pending] = useActionState<
    PredictionState,
    FormData
  >(savePrediction, {});
  const isEdit = initialProbability !== undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="question_id" value={questionId} />

      <div>
        <div className="flex items-end justify-between">
          <label htmlFor="probability" className="t-label-1 text-label-neutral">
            YES일 확률
          </label>
          <span className="t-title-1 tabular-nums text-primary">
            {probability}%
          </span>
        </div>
        <input
          id="probability"
          type="range"
          name="probability"
          min={1}
          max={99}
          value={probability}
          onChange={(e) => setProbability(Number(e.target.value))}
          className="probability-slider mt-4 w-full"
          style={{ "--value": `${probability}%` } as React.CSSProperties}
        />
        <div className="mt-3 flex justify-between t-caption-1 text-label-alt">
          <span>아닐 것 같다</span>
          <span>반반</span>
          <span>그럴 것 같다</span>
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="t-label-1 text-label-neutral">한 줄 근거 (선택)</span>
        <input
          name="reason"
          defaultValue={initialReason}
          maxLength={100}
          placeholder="왜 그렇게 생각하나요?"
          className={input}
        />
      </label>

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.savedAt && !state.error && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          예측을 저장했어요.
        </p>
      )}

      <button disabled={pending} className={`${button.primary} w-full`}>
        {pending ? "저장 중…" : isEdit ? "예측 수정" : "예측 저장"}
      </button>
    </form>
  );
}
