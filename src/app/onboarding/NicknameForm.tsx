"use client";

import Link from "next/link";
import { useActionState } from "react";
import { button, input } from "@/components/ui";
import { saveNickname, type NicknameState } from "./actions";

const checkClass =
  "h-5 w-5 shrink-0 cursor-pointer rounded accent-[var(--color-primary)]";

export default function NicknameForm({ initial }: { initial?: string }) {
  const [state, formAction, pending] = useActionState<NicknameState, FormData>(
    saveNickname,
    {},
  );
  const isNew = initial === undefined;

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

      {isNew && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-bg-alt p-4 t-label-1 text-label-neutral">
          <label className="flex items-center gap-2.5">
            <input type="checkbox" name="age" required className={checkClass} />
            <span>
              <strong className="text-primary">[필수]</strong> 만 14세
              이상이에요.
            </span>
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              name="terms"
              required
              className={checkClass}
            />
            <span>
              <strong className="text-primary">[필수]</strong>{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline underline-offset-2"
              >
                이용약관
              </Link>
              에 동의해요.
            </span>
          </label>
          <p className="t-caption-1 text-label-alt">
            개인정보 처리에 관한 내용은{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="!font-semibold underline underline-offset-2"
            >
              개인정보처리방침
            </Link>
            에서 확인할 수 있어요.
          </p>
        </div>
      )}

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      <button disabled={pending} className={`${button.primary} mt-2 w-full`}>
        {pending ? "저장 중…" : isNew ? "동의하고 시작하기" : "저장"}
      </button>
    </form>
  );
}
