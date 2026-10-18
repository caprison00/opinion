"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

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
        className="flex h-9 items-center gap-1 rounded-lg px-2 t-label-1 !font-semibold text-label-neutral hover:bg-fill"
      >
        {current?.label}
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-line bg-surface p-1 shadow-small"
        >
          {options.map((o) => (
            <li key={o.value}>
              <Link
                href={o.href}
                role="menuitem"
                scroll={false}
                aria-current={o.value === value ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 t-label-1 hover:bg-fill ${
                  o.value === value
                    ? "!font-bold text-label"
                    : "text-label-neutral"
                }`}
              >
                {o.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
