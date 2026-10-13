import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">🔮</p>
      <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-gray-500">
        주소가 바뀌었거나 삭제된 질문일 수 있어요.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white"
      >
        홈으로
      </Link>
    </main>
  );
}
