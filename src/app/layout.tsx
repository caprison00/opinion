import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import VisitTracker from "@/components/VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "예감", template: "%s · 예감" },
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
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-jp.min.css"
        />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-label">
        {children}
        <BottomNav />
        <VisitTracker />
      </body>
    </html>
  );
}
