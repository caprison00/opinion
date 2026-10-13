import Link from "next/link";
import { SearchXIcon } from "@/components/icons";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <SearchXIcon className="h-10 w-10 text-label-assist" strokeWidth={1.5} />
      <h1 className="mt-2 t-heading-1">페이지를 찾을 수 없어요</h1>
      <p className="t-body-3 text-label-alt">
        주소가 바뀌었거나 삭제된 질문일 수 있어요.
      </p>
      <Link href="/" className={`${button.primary} mt-4`}>
        홈으로
      </Link>
    </main>
  );
}
