"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";

// 정렬 드롭다운: 항목마다 링크라서 새로고침·공유해도 정렬이 유지된다
export default function SortMenu({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-surface pl-3 pr-2.5 sm:pl-3.5 sm:pr-3 t-label-1 !font-bold text-label hover:bg-fill-alt"
      >
        <span className="hidden !font-semibold text-label-alt sm:inline">
          정렬
        </span>
        {current?.label}
        <ChevronDownIcon className="h-4 w-4 text-label-neutral" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-12 z-20 min-w-[200px] rounded-[14px] border border-line bg-surface p-1.5 shadow-large"
        >
          {options.map((o) => (
            <li key={o.value}>
              <Link
                href={o.href}
                role="menuitem"
                scroll={false}
                aria-current={o.value === value ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center justify-between gap-3 rounded-[10px] px-3 t-label-1 ${
                  o.value === value
                    ? "bg-yes-soft !font-extrabold text-yes-ink"
                    : "!font-semibold text-label hover:bg-fill"
                }`}
              >
                {o.label}
                {o.value === value && <CheckIcon className="h-4 w-4" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
