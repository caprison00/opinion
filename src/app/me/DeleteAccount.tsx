"use client";

import { useActionState, useState } from "react";
import { button, input } from "@/components/ui";
import { deleteAccount, type DeleteState } from "./actions";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    deleteAccount,
    {},
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="t-label-1 text-label-alt underline underline-offset-2 hover:text-negative-strong"
      >
        회원 탈퇴
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-line p-5"
    >
      <p className="t-body-2 !font-bold">정말 탈퇴할까요?</p>
      <p className="t-label-1 text-label-neutral">
        닉네임, 예측, 근거, 점수가 모두 바로 삭제되고 복구할 수 없어요.
        계속하려면 아래 칸에 <strong>탈퇴</strong>를 입력해 주세요.
      </p>
      <input name="confirm" placeholder="탈퇴" className={input} />
      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`${button.secondary} flex-1`}
        >
          취소
        </button>
        <button
          disabled={pending}
          className={`${button.primary} flex-1 !bg-negative hover:!bg-negative-strong`}
        >
          {pending ? "처리 중…" : "탈퇴하기"}
        </button>
      </div>
    </form>
  );
}
