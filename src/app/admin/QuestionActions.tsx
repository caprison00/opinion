"use client";

import { useActionState, useEffect, useState } from "react";
import { button } from "@/components/ui";
import {
  closeQuestion,
  resolveQuestion,
  type AdminActionState,
} from "./actions";

// 판정·마감 버튼. 한 번 더 확인하는 단계는 브라우저 기본 확인창(window.confirm) 대신
// 화면 안의 확인 줄로 한다. 기본 확인창은 자동화 도구가 자동으로 '취소'하거나 다루지 못해
// 프로그램 클릭으로는 판정이 되지 않았다. 확인 줄은 진짜 <button>이라 어떤 클릭에도 똑같이 동작한다.
type Pending =
  | { kind: "close" }
  | { kind: "resolve"; value: string; label: string };

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
          type === "ox" && i === 1 ? button.smallDanger : button.smallPrimary,
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

  // 지금 확인을 기다리는 동작 (없으면 null)
  const [asking, setAsking] = useState<Pending | null>(null);
  // 처리가 끝나면(성공·실패 모두) 확인 줄을 닫는다
  useEffect(() => setAsking(null), [closeState, resolveState]);

  const busy = closing || resolving;
  const message = !asking
    ? ""
    : asking.kind === "close"
      ? "지금 마감할까요? 더 이상 예측을 받지 않아요."
      : asking.value === "void"
        ? "이 질문을 무효 처리할까요? 채점하지 않아요."
        : `정답을 "${asking.label}"(으)로 판정할까요?`;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {canClose && (
          <button
            type="button"
            disabled={busy}
            aria-expanded={asking?.kind === "close"}
            onClick={() => setAsking({ kind: "close" })}
            className={button.smallSecondary}
          >
            마감 처리
          </button>
        )}
        {resultButtons.map((b) => (
          <button
            key={b.value}
            type="button"
            disabled={busy}
            aria-expanded={
              asking?.kind === "resolve" && asking.value === b.value
            }
            onClick={() =>
              setAsking({ kind: "resolve", value: b.value, label: b.label })
            }
            className={b.className}
          >
            {b.label}
          </button>
        ))}
      </div>

      {asking && (
        // 확인 줄: '판정하기'를 눌러야 실제로 저장된다 (서버 동작은 그대로)
        <form
          action={asking.kind === "close" ? closeAction : resolveAction}
          role="group"
          aria-label="확인"
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-bg-alt px-3 py-2"
        >
          <input type="hidden" name="id" value={id} />
          {asking.kind === "resolve" && (
            <input type="hidden" name="result" value={asking.value} />
          )}
          <p className="t-label-2 !font-semibold text-label">{message}</p>
          <div className="flex gap-1.5">
            <button disabled={busy} className={button.smallPrimary}>
              {busy
                ? "처리 중…"
                : asking.kind === "close"
                  ? "마감하기"
                  : asking.value === "void"
                    ? "무효 처리하기"
                    : "판정하기"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking(null)}
              className={button.smallSecondary}
            >
              취소
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-2 t-caption-1 text-negative-strong">{error}</p>
      )}
    </div>
  );
}
