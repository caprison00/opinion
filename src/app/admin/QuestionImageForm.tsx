"use client";

import { useActionState, useEffect, useState } from "react";
import { button } from "@/components/ui";
import type { ImageFields } from "@/lib/images";
import { setQuestionImage, type AdminActionState } from "./actions";
import ImageField from "./ImageField";

// 질문 관리: 공개된 질문에도 사진만 넣거나 바꾸거나 뺀다 (질문 내용은 그대로)
export default function QuestionImageForm({
  id,
  value,
}: {
  id: string;
  value: ImageFields;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setQuestionImage,
    {},
  );
  const [shown, setShown] = useState<AdminActionState>({});

  // "저장했어요"는 잠깐 보였다가 사라진다
  useEffect(() => {
    setShown(state);
    if (!state.ok) return;
    const t = setTimeout(() => setShown({}), 2500);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center t-label-2 !font-semibold text-label-neutral hover:text-label">
        {value.image_url ? "사진 바꾸기" : "사진 추가"}
        <span className="ml-1 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <form action={action} className="mt-2 flex max-w-xl flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <ImageField
          value={value}
          hint="직접 만들었거나 사용이 허락된 사진만 올려 주세요(뉴스·연예인·중계 화면 사진은 안 돼요). 결과를 암시하는 사진도 피해 주세요. 사진을 빼면 이슈 묶음의 사진을 써요."
        />
        <div className="flex items-center gap-2">
          <button
            disabled={pending}
            className={`${button.smallSecondary} shrink-0`}
          >
            {pending ? "저장 중…" : "사진 저장"}
          </button>
          <span aria-live="polite" className="t-label-2 !font-semibold">
            {shown.ok && <span className="text-positive">저장했어요</span>}
            {shown.error && (
              <span className="text-negative-strong">{shown.error}</span>
            )}
          </span>
        </div>
      </form>
    </details>
  );
}
