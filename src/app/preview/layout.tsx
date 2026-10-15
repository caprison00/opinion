import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import "./preview.css";

// 디자인 테스트 페이지: 견본 데이터로만 그린다. 검색엔진에 노출하지 않는다.
export const metadata: Metadata = {
  title: "디자인 테스트",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pv">
      <div className="test-bar">
        디자인 테스트 화면이에요 · 견본 데이터라 눌러도 저장되지 않아요 ·{" "}
        <Link href="/" style={{ textDecoration: "underline" }}>
          실제 사이트로
        </Link>
      </div>
      <header className="topbar">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "center" }}>
            <Link href="/preview" aria-label="예감 테스트 홈">
              <Wordmark className="h-8 w-auto" />
            </Link>
            <nav className="hidden md:flex">
              <Link href="/preview">핫이슈</Link>
              <Link href="/preview#ranking">랭킹</Link>
              <Link href="/preview#mine">내 예측</Link>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemeToggle />
            <span className="me-chip">
              <span className="tier">골드</span>
              <span className="hidden sm:inline">카페인</span>
            </span>
          </div>
        </div>
      </header>
      {children}
      <footer className="wrap foot">
        © 2026 예감 · 돈이나 재화를 걸지 않는 예측 서비스예요. 점수는 표시용이며
        어떤 것으로도 교환할 수 없어요.
      </footer>
    </div>
  );
}
