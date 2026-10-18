import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// 검색엔진용 사이트 지도: 주요 화면 + 공개된 질문 (실서버만)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    "",
    "/questions",
    "/ranking",
    "/terms",
    "/privacy",
  ].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" }));
  if (!IS_PRODUCTION) return pages;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from("questions")
    .select("id, created_at, resolved_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  return [
    ...pages,
    ...(data ?? []).map((q) => ({
      url: `${SITE_URL}/questions/${q.id}`,
      lastModified: q.resolved_at ?? q.created_at,
    })),
  ];
}
