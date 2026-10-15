"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "dark" | "light";

export const THEME_COLORS: Record<Theme, string> = {
  dark: "#141415",
  light: "#ffffff",
};

// 화면 테마 전환. 선택은 이 브라우저에만 저장한다 (서버로 보내지 않음).
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[current]);
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
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

  const label =
    theme === "light" ? "다크 모드로 바꾸기" : "라이트 모드로 바꾸기";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-label-alt transition-colors hover:bg-fill hover:text-label"
    >
      {theme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
}
