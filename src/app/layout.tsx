import type { Metadata, Viewport } from "next";
import VisitTracker from "@/components/VisitTracker";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "예감", template: "%s · 예감" },
  // 개발 서버는 검색엔진에 노출하지 않는다
  ...(IS_PRODUCTION ? {} : { robots: { index: false, follow: false } }),
  description:
    "돈을 걸지 않고 미래 사건을 확률로 예측하면, 적중 점수와 랭킹이 쌓이는 집단 예측 서비스",
  openGraph: {
    title: "예감",
    description: "미래를 확률로 예측하고, 적중 점수와 랭킹을 쌓아보세요.",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        {/* 화면이 그려지기 전에 저장된 테마를 적용해 깜빡임을 막는다. 기본은 라이트. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark"){document.documentElement.dataset.theme="dark"}}catch(e){}`,
          }}
        />
        {/* Pretendard 가변 글꼴을 글자 조각으로 나눈 판: 화면에 쓰인 글자 조각만 받는다.
            (예전 일본어 포함 고정 굵기판은 굵기 하나에 약 2MB × 5가지라 첫 화면이 매우 느렸다) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-label">
        {!IS_PRODUCTION && (
          <div className="bg-[#7c3aed] px-4 py-1 text-center text-[12px] font-bold text-white">
            개발 서버 · 실제 서비스(yegam.art)와 데이터가 달라요
          </div>
        )}
        {children}
        <VisitTracker />
      </body>
    </html>
  );
}
