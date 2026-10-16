"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const INTERVAL = 5000;

// 여러 장을 같은 자리에서 차례로 보여준다 (이슈 묶음 카드의 질문 롤링).
// - 5초마다 다음 장, 마우스를 올리거나 포커스가 있으면 멈춤
// - 움직임 줄이기 설정이면 자동으로 넘기지 않음, 화면이 안 보일 때도 멈춤
// - 모든 장을 겹쳐 두어 가장 긴 장 높이에 맞춘다 (넘길 때 카드 높이가 흔들리지 않게)
export default function Rotator({
  slides,
  label,
  controlsClassName = "mt-4",
}: {
  slides: React.ReactNode[];
  label: string;
  controlsClassName?: string; // 넘기기 버튼 줄의 여백
}) {
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((i) => (i + 1) % n);
      }
    }, INTERVAL);
    return () => clearInterval(t);
  }, [n, paused]);

  const go = (i: number) => setIndex((i + n) % n);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid">
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${n}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {slide}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className={`flex items-center gap-2 ${controlsClassName}`}>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="이전 질문"
            className="flex h-7 w-7 items-center justify-center rounded-full text-label-alt hover:bg-fill hover:text-label"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}번째 질문 보기`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-fill-strong"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="다음 질문"
            className="flex h-7 w-7 items-center justify-center rounded-full text-label-alt hover:bg-fill hover:text-label"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <span className="ml-1 t-caption-1 tabular-nums text-label-alt">
            {index + 1} / {n}
          </span>
        </div>
      )}
    </div>
  );
}
