import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";

const BOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

// 방문 기록: 쿠키를 새로 만들지 않고, IP 원본도 저장하지 않는다 (DB 함수 log_page_view 참고).
export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT.test(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { path?: unknown; referrer?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "";
  if (!path.startsWith("/") || path.startsWith("/admin")) {
    return new NextResponse(null, { status: 204 });
  }

  let referrerHost: string | null = null;
  if (typeof body.referrer === "string" && body.referrer) {
    try {
      const host = new URL(body.referrer).hostname;
      if (host && host !== request.nextUrl.hostname) referrerHost = host;
    } catch {
      // 잘못된 주소는 무시
    }
  }

  const { supabase, user, isAdmin } = await getViewer();
  // 관리자 본인의 방문은 통계에서 뺀다.
  if (isAdmin) return new NextResponse(null, { status: 204 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";

  await supabase.rpc("log_page_view", {
    p_path: path,
    p_ip: ip,
    p_user_agent: userAgent,
    p_is_member: !!user,
    p_device: /Mobi|Android|iPhone|iPad/i.test(userAgent)
      ? "mobile"
      : "desktop",
    p_referrer_host: referrerHost,
  });

  return new NextResponse(null, { status: 204 });
}
