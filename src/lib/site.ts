// 실서버(yegam.art)와 개발 서버(dev.yegam.art) 구분.
// Vercel이 자동으로 넣어 주는 VERCEL_ENV가 "production"이면 실서버(main 브랜치).
export const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (IS_PRODUCTION ? "https://yegam.art" : "https://dev.yegam.art");
