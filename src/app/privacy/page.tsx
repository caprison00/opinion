import LegalPage from "@/components/LegalPage";

export const metadata = { title: "개인정보처리방침" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  return <LegalPage kind="privacy" version={v} />;
}
