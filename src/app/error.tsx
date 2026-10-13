"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="text-xl font-bold">문제가 생겼어요</h1>
      <p className="text-sm text-gray-500">잠시 후 다시 시도해 주세요.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white"
      >
        다시 시도
      </button>
    </main>
  );
}
