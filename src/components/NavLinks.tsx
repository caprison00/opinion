"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/ranking", label: "랭킹" },
  { href: "/me", label: "내 예측" },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// 데스크톱 상단 메뉴
export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  // 홈은 로고로 가므로 PC 메뉴에서는 뺀다 (모바일 하단 탭에는 남긴다)
  const base = NAV_ITEMS.filter((item) => item.href !== "/");
  const items = isAdmin ? [...base, { href: "/admin", label: "관리자" }] : base;

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-lg px-3 py-2 t-body-3 !font-semibold transition-colors hover:bg-fill ${
            isActivePath(pathname, item.href) ? "text-label" : "text-label-alt"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
