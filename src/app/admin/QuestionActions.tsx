"use client";

import { useActionState } from "react";
import { button } from "@/components/ui";
import {
  closeQuestion,
  resolveQuestion,
  type AdminActionState,
} from "./actions";

export default function QuestionActions({
  id,
  type,
  options,
  canClose,
  accepting,
}: {
  id: string;
  type: "ox" | "choice";
  options: string[];
  canClose: boolean;
  accepting: boolean;
}) {
  // 예측을 받는 중에는 무효 처리만, 마감 후에는 정답 선택지 또는 무효로 판정(재판정 포함)
  const answers = accepting
    ? []
    : options.map((label, i) => ({
        value: String(i),
        label,
        className:
          type === "ox" && i === 1
            ? `${button.smallPrimary} !bg-[#e52222] hover:!bg-[#b20c0c]`
            : button.smallPrimary,
      }));
  const resultButtons = [
    ...answers,
    { value: "void", label: "무효", className: button.smallSecondary },
  ];
  const [closeState, closeAction, closing] = useActionState<
    AdminActionState,
    FormData
  >(closeQuestion, {});
  const [resolveState, resolveAction, resolving] = useActionState<
    AdminActionState,
    FormData
  >(resolveQuestion, {});
  const error = closeState.error ?? resolveState.error;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {canClose && (
          <form
            action={closeAction}
            onSubmit={(e) => {
              if (!confirm("지금 마감할까요? 더 이상 예측을 받지 않아요.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={id} />
            <button disabled={closing} className={button.smallSecondary}>
              마감 처리
            </button>
          </form>
        )}
        {resultButtons.map((b) => (
          <form
            key={b.value}
            action={resolveAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  b.value === "void"
                    ? "이 질문을 무효 처리할까요? 채점하지 않아요."
                    : `정답을 "${b.label}"(으)로 판정할까요?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="result" value={b.value} />
            <button disabled={resolving} className={b.className}>
              {b.label}
            </button>
          </form>
        ))}
      </div>
      {error && (
        <p className="mt-2 t-caption-1 text-negative-strong">{error}</p>
      )}
    </div>
  );
}
