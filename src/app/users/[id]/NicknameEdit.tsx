"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilIcon } from "@/components/icons";
import { button, input } from "@/components/ui";
import { renameNickname, type RenameState } from "./actions";

// 내 프로필: 이름 옆 ✎ → 이름 바로 아래에 입력칸이 열린다
export default function NicknameEdit({ nickname }: { nickname: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<RenameState, FormData>(
    renameNickname,
    {},
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1 t-label-2 text-label-alt hover:text-label"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        닉네임 변경
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full max-w-sm">
      <div className="flex gap-2">
        <input
          name="nickname"
          defaultValue={nickname}
          maxLength={12}
          autoFocus
          aria-label="새 닉네임"
          className={`${input} h-10 flex-1`}
        />
        <button disabled={pending} className={`${button.smallPrimary} h-10`}>
          {pending ? "저장 중" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`${button.smallSecondary} h-10`}
        >
          취소
        </button>
      </div>
      <p
        className={`mt-1.5 t-caption-1 ${state.error ? "text-negative-strong" : "text-label-alt"}`}
      >
        {state.error ?? "2~12자, 한글·영문·숫자·밑줄(_)"}
      </p>
    </form>
  );
}
