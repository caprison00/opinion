"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InfoIcon } from "./icons";

// 제목 옆 ⓘ 툴팁 (감싸는 제목에 relative를 주면 제목 아래 왼쪽에 붙는다): PC는 마우스를 올리면, 휴대폰은 누르면 보인다. 밖을 누르거나 Esc로 닫힌다.
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const id = useId();

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

  const shown = open || hover;
  return (
    <span
      ref={box}
      className="inline-flex align-middle"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="설명 보기"
        aria-describedby={shown ? id : undefined}
        aria-expanded={shown}
        className="flex h-6 w-6 items-center justify-center rounded-full text-label-assist transition-colors hover:text-label-neutral"
      >
        <InfoIcon className="h-4 w-4" />
      </button>
      {shown && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-max max-w-[min(320px,100%)] rounded-lg bg-brand px-3 py-2 t-caption-1 !font-medium leading-snug text-white shadow-medium"
        >
          {text}
        </span>
      )}
    </span>
  );
}
