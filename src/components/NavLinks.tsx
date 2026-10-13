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
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "관리자" }]
    : NAV_ITEMS;

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
