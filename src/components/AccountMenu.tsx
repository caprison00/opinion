"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BadgeIcon from "./BadgeIcon";
import {
  BadgeLineIcon,
  ChartLineIcon,
  ChevronDownIcon,
  GearIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  XIcon,
} from "./icons";
import { Wordmark } from "./Logo";
import TierMark from "./TierMark";
import { button } from "./ui";
import type { Tier } from "@/lib/tiers";

export type AccountInfo = {
  id: string;
  nickname: string;
  tier: Tier;
  badge: { key: string; level: number } | null;
  season: string; // "10월 시즌 +212점 · 9위 · 상위 23%"
  openCount: number; // 진행 중인 내 예측 수
  badgeCount: number; // 받은 뱃지 수
};

type Item = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  note?: string;
};

// PC 펼침 메뉴와 모바일 ☰ 메뉴가 같은 순서를 쓴다
function accountItems(me: AccountInfo | null, isAdmin: boolean): Item[] {
  const items: Item[] = me
    ? [
        {
          href: "/me/badges",
          label: "내 뱃지",
          icon: BadgeLineIcon,
          note: `${me.badgeCount}/12`,
        },
        {
          href: "/me",
          label: "내 예측",
          icon: ChartLineIcon,
          note: me.openCount ? `진행 중 ${me.openCount}` : undefined,
        },
        { href: "/settings", label: "설정", icon: GearIcon },
      ]
    : [{ href: "/settings", label: "설정", icon: GearIcon }];
  if (isAdmin)
    items.push({ href: "/admin", label: "관리자", icon: ShieldIcon });
  return items;
}

function Who({ me, dark }: { me: AccountInfo; dark?: boolean }) {
  return (
    <>
      <p className="flex items-center gap-1.5 t-body-2 !font-bold">
        <TierMark tier={me.tier} />
        {me.badge && (
          <BadgeIcon badgeKey={me.badge.key} level={me.badge.level} />
        )}
        <span className="truncate">{me.nickname}</span>
      </p>
      <p
        className={`mt-1 t-caption-1 ${dark ? "text-white/75" : "text-label-alt"}`}
      >
        {me.season}
      </p>
    </>
  );
}

function LogoutButton({ className }: { className: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button className={className}>
        <LogOutIcon className="h-[18px] w-[18px]" />
        로그아웃
      </button>
    </form>
  );
}

// 바깥을 누르거나 Esc를 누르면 닫는다. 다른 화면으로 가면 닫는다.
function useClosable(open: boolean, close: () => void) {
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => close(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return box;
}

// PC: 닉네임을 누르면 펼쳐지는 메뉴
export function UserMenu({
  me,
  isAdmin,
}: {
  me: AccountInfo;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useClosable(open, () => setOpen(false));
  const items = accountItems(me, isAdmin);

  return (
    <div ref={box} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface pl-2 pr-2.5 transition-shadow hover:shadow-small ${
          open ? "ring-3 ring-fill-strong" : ""
        }`}
      >
        <TierMark tier={me.tier} />
        {me.badge && (
          <BadgeIcon badgeKey={me.badge.key} level={me.badge.level} />
        )}
        <span className="max-w-[120px] truncate t-label-1 !font-bold text-label">
          {me.nickname}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-label-alt" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-64 rounded-[14px] border border-line bg-surface p-1.5 shadow-medium"
        >
          <div className="border-b border-line-alt pb-1.5">
            <Link
              href={`/users/${me.id}`}
              role="menuitem"
              aria-label="내 프로필"
              className="block rounded-lg px-3 pb-2.5 pt-2 hover:bg-fill"
            >
              <Who me={me} />
            </Link>
          </div>
          <div className="py-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 t-label-1 !font-semibold text-label hover:bg-fill"
              >
                <it.icon className="h-[18px] w-[18px] text-label-alt" />
                {it.label}
                {it.note && (
                  <span className="ml-auto t-caption-1 !font-medium text-label-alt">
                    {it.note}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="border-t border-line-alt pt-1">
            <LogoutButton className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left t-label-1 text-label-alt hover:bg-fill" />
          </div>
        </div>
      )}
    </div>
  );
}

// 모바일: 오른쪽 위 ☰ → 오른쪽에서 나오는 패널
export function MobileMenu({
  me,
  isAdmin,
  signedIn,
}: {
  me: AccountInfo | null;
  isAdmin: boolean;
  signedIn: boolean; // 로그인했지만 닉네임을 아직 안 정한 경우 me가 없다
}) {
  const [open, setOpen] = useState(false);
  const box = useClosable(open, () => setOpen(false));
  const items = accountItems(me, isAdmin);

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-label hover:bg-fill"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {/* 헤더의 흐림 효과 안에서는 fixed가 헤더 높이에 갇혀서 body에 그린다 */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-[rgb(13_22_38/0.4)]"
              aria-hidden="true"
            />
            <div
              ref={box}
              role="dialog"
              aria-modal="true"
              aria-label="메뉴"
              className="absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col bg-surface shadow-large"
            >
              <div className="flex items-center justify-between px-4 pb-1.5 pt-3">
                <Link href="/" aria-label="예감 홈">
                  <Wordmark className="h-7 w-auto" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="메뉴 닫기"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-label-neutral hover:bg-fill"
                >
                  <XIcon className="h-6 w-6" />
                </button>
              </div>

              {me ? (
                <Link
                  href={`/users/${me.id}`}
                  className="mx-4 my-2 block rounded-[14px] bg-hero p-4 text-white"
                >
                  <Who me={me} dark />
                </Link>
              ) : signedIn ? null : (
                <div className="px-4 py-2">
                  <Link href="/login" className={`${button.primary} w-full`}>
                    구글로 로그인
                  </Link>
                  <p className="mt-2 t-caption-1 text-label-alt">
                    로그인하면 예측하고 점수·티어를 쌓을 수 있어요.
                  </p>
                </div>
              )}

              <nav className="flex flex-col px-2 pt-1">
                {items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-3 t-body-2 !font-semibold text-label hover:bg-fill"
                  >
                    <it.icon className="h-5 w-5 text-label-alt" />
                    {it.label}
                    {it.note && (
                      <span className="ml-auto t-caption-1 text-label-alt">
                        {it.note}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-line-alt px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                {signedIn && (
                  <LogoutButton className="flex w-full items-center gap-3 py-2.5 t-body-2 !font-semibold text-label-neutral" />
                )}
                <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1 t-caption-1 text-label-alt">
                  <Link href="/terms">이용약관</Link>
                  <Link href="/privacy" className="!font-bold text-label">
                    개인정보처리방침
                  </Link>
                  <Link href="/licenses">라이선스</Link>
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
