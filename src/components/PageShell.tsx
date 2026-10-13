import Header from "./Header";
import { container } from "./ui";

// 모든 일반 화면의 공통 틀: 상단 메뉴 + 본문 (모바일은 하단 탭 높이만큼 여백)
export default function PageShell({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <>
      <Header />
      <main
        className={`${container} pb-28 pt-5 md:pb-20 md:pt-10 ${
          narrow ? "md:max-w-[720px]" : ""
        }`}
      >
        {children}
      </main>
    </>
  );
}
