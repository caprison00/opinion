import Footer from "./Footer";
import Header from "./Header";
import NewBadgeBanner from "./NewBadgeBanner";
import { container } from "./ui";

// 모든 일반 화면의 공통 틀: 상단 메뉴 + 본문
export default function PageShell({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main
        className={`${container} flex-1 pb-16 pt-5 md:pb-20 md:pt-10 ${
          narrow ? "md:max-w-[720px]" : ""
        }`}
      >
        <NewBadgeBanner />
        {children}
      </main>
      <Footer />
    </div>
  );
}
