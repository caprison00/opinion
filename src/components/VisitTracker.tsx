"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// 화면이 바뀔 때마다 방문을 한 번 기록한다. 쿠키·로컬 저장소는 쓰지 않는다.
export default function VisitTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    // 바깥에서 들어온 경로는 처음 연 화면에서만 의미가 있다.
    const referrer = first.current ? document.referrer : "";
    first.current = false;

    const body = JSON.stringify({ path: pathname, referrer });
    try {
      if (!navigator.sendBeacon?.("/api/track", body)) {
        fetch("/api/track", { method: "POST", body, keepalive: true });
      }
    } catch {
      // 통계 실패는 화면에 영향을 주지 않는다.
    }
  }, [pathname]);

  return null;
}
