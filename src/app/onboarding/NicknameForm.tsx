"use client";

import { useActionState } from "react";
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
        className="rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-gray-900"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-xl bg-gray-900 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "저장 중…" : "시작하기"}
      </button>
    </form>
  );
}
