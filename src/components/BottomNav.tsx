"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TrophyIcon, UserIcon } from "./icons";
import { NAV_ITEMS, isActivePath } from "./NavLinks";

const ICONS = { "/": HomeIcon, "/ranking": TrophyIcon, "/me": UserIcon };

// 로그인·닉네임 설정·디자인 의견 화면에서는 숨긴다.
const HIDDEN_PATHS = ["/login", "/onboarding", "/compare"];

// 모바일 하단 탭 (데스크톱에서는 상단 메뉴를 쓴다)
export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="flex">
        {NAV_ITEMS.map(({ href, label }) => {
          const Icon = ICONS[href as keyof typeof ICONS];
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                  active ? "text-label" : "text-label-assist"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
