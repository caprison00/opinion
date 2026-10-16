import type { MetadataRoute } from "next";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";

// 실서버만 검색엔진에 노출한다. 개발 서버는 전부 막는다.
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/me",
        "/onboarding",
        "/preview",
        "/compare",
        "/search",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
