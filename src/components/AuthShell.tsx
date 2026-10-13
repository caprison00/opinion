import Logo from "./Logo";

// 로그인·닉네임 설정처럼 메뉴 없이 가운데 카드만 있는 화면
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-alt px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl bg-white p-7 shadow-large md:p-10">
        <Logo />
        {children}
      </div>
    </main>
  );
}
