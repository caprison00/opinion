import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "예감",
  description: "미래 사건을 확률로 예측하고 적중 점수와 랭킹을 쌓는 집단 예측 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
