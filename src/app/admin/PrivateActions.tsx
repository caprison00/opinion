"use client";

import Link from "next/link";
import { useActionState } from "react";
import { button } from "@/components/ui";
import {
  deletePrivateQuestion,
  publishQuestion,
  type AdminActionState,
} from "./actions";

// 비공개 질문 한 줄의 버튼들: 미리보기 · 수정 · 공개하기 · 삭제
export default function PrivateActions({ id }: { id: string }) {
  const [state, publishAction, publishing] = useActionState<
    AdminActionState,
    FormData
  >(publishQuestion, {});

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <form
          action={publishAction}
          onSubmit={(e) => {
            if (
              !confirm(
                "이 질문을 공개할까요? 지금부터 예측을 받고, 공개한 뒤에는 수정·삭제할 수 없어요.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button disabled={publishing} className={button.smallPrimary}>
            {publishing ? "공개 중…" : "공개하기"}
          </button>
        </form>
        <Link
          href={`/admin/questions/${id}/edit`}
          className={button.smallSecondary}
        >
          수정
        </Link>
        <Link href={`/questions/${id}`} className={button.smallSecondary}>
          미리보기
        </Link>
        <form
          action={deletePrivateQuestion}
          onSubmit={(e) => {
            if (!confirm("이 비공개 질문을 삭제할까요? 되돌릴 수 없어요.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button className={`${button.smallSecondary} !text-negative-strong`}>
            삭제
          </button>
        </form>
      </div>
      {state.error && (
        <p className="mt-2 t-label-2 text-negative-strong">{state.error}</p>
      )}
    </div>
  );
}
