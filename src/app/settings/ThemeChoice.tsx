"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { THEME_COLORS } from "@/components/ThemeToggle";

type Theme = "light" | "dark";

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "라이트", Icon: SunIcon },
  { value: "dark", label: "다크", Icon: MoonIcon },
];

// 설정 > 화면 모드. 상단 버튼(ThemeToggle)과 같은 저장 방식 (이 브라우저에만)
export default function ThemeChoice() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[next]);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 저장이 막힌 브라우저에서는 이번 방문 동안만 적용된다.
    }
    setTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="화면 모드"
      className="inline-flex gap-1 rounded-[14px] bg-bg-alt p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => choose(value)}
            className={`flex h-10 items-center gap-1.5 rounded-[11px] px-4 t-label-1 !font-bold transition-colors ${
              on ? "bg-surface text-label shadow-xsmall" : "text-label-neutral"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
