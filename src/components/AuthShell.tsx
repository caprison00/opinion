import Link from "next/link";
import Logo from "./Logo";

// 로그인·닉네임 설정처럼 메뉴 없이 가운데 카드만 있는 화면
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-alt px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl bg-white p-7 shadow-large md:p-10">
        <Logo className="h-11 w-auto" />
        {children}
      </div>
      <nav className="mt-6 flex gap-4 t-caption-1">
        <Link href="/terms" className="text-label-alt hover:text-label">
          이용약관
        </Link>
        <Link
          href="/privacy"
          className="!font-bold text-label-neutral hover:text-label"
        >
          개인정보처리방침
        </Link>
      </nav>
    </main>
  );
}
