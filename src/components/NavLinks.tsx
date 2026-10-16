"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "./icons";

// 검색은 PC에서는 상단 검색창, 모바일에서는 검색 아이콘
export const NAV_ITEMS = [{ href: "/ranking", label: "랭킹" }];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// PC 상단 메뉴: 랭킹 (내 메뉴는 오른쪽 닉네임 메뉴로)
export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
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

// 모바일 상단 바깥 메뉴: 랭킹 글자 + 검색 아이콘
export function MobileNavLinks() {
  const pathname = usePathname();
  const on = (href: string) =>
    isActivePath(pathname, href) ? "text-label" : "text-label-alt";

  return (
    <nav className="flex items-center md:hidden">
      <Link
        href="/ranking"
        className={`flex h-11 items-center rounded-xl px-2.5 t-label-1 !font-bold hover:bg-fill ${on("/ranking")}`}
      >
        랭킹
      </Link>
      <Link
        href="/search"
        aria-label="검색"
        className={`flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fill ${on("/search")}`}
      >
        <SearchIcon className="h-5 w-5" />
      </Link>
    </nav>
  );
}
