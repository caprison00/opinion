"use client";

import { useActionState } from "react";
import { button, input } from "@/components/ui";
import { saveNickname, type NicknameState } from "./actions";

export default function NicknameForm({ initial }: { initial?: string }) {
  const [state, formAction, pending] = useActionState<NicknameState, FormData>(
    saveNickname,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="nickname"
        defaultValue={initial}
        placeholder="닉네임 (2~12자)"
        maxLength={12}
        required
        className={input}
      />
      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      <button disabled={pending} className={`${button.primary} mt-2 w-full`}>
        {pending ? "저장 중…" : initial ? "저장" : "시작하기"}
      </button>
    </form>
  );
}
