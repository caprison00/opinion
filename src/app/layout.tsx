import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
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
      <body className="bg-white text-gray-900 antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
