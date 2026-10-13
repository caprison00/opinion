import LegalPage from "@/components/LegalPage";

export const metadata = { title: "이용약관" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  return <LegalPage kind="terms" version={v} />;
}
