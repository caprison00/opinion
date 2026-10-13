"use client";

import { AlertIcon } from "@/components/icons";
import { button } from "@/components/ui";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertIcon className="h-10 w-10 text-label-assist" strokeWidth={1.5} />
      <h1 className="mt-2 t-heading-1">문제가 생겼어요</h1>
      <p className="t-body-3 text-label-alt">잠시 후 다시 시도해 주세요.</p>
      <button onClick={reset} className={`${button.primary} mt-4`}>
        다시 시도
      </button>
    </main>
  );
}
