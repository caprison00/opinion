"use client";

import { useActionState, useState } from "react";
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
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="question_id" value={questionId} />

      <div>
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium">YES일 확률</span>
          <span className="text-3xl font-bold tabular-nums">
            {probability}%
          </span>
        </div>
        <input
          type="range"
          name="probability"
          min={1}
          max={99}
          value={probability}
          onChange={(e) => setProbability(Number(e.target.value))}
          className="mt-2 w-full accent-gray-900"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>아닐 것 같다</span>
          <span>반반</span>
          <span>그럴 것 같다</span>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">한 줄 근거 (선택)</span>
        <input
          name="reason"
          defaultValue={initialReason}
          maxLength={100}
          placeholder="왜 그렇게 생각하나요?"
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.savedAt && !state.error && (
        <p className="text-sm text-green-700">예측을 저장했어요!</p>
      )}

      <button
        disabled={pending}
        className="rounded-xl bg-gray-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "저장 중…" : isEdit ? "예측 수정" : "예측 저장"}
      </button>
    </form>
  );
}
