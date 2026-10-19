"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const INTERVAL = 5000;

// 여러 장을 같은 자리에서 차례로 보여준다 (이슈 묶음 카드의 질문 롤링).
// - 5초마다 다음 장, 마우스를 올리거나 포커스가 있으면 멈춤
// - 움직임 줄이기 설정이면 자동으로 넘기지 않음, 화면이 안 보일 때도 멈춤
// - 모든 장을 겹쳐 두어 가장 긴 장 높이에 맞춘다 (넘길 때 카드 높이가 흔들리지 않게)
// - 휴대폰: 좌우로 밀면 넘어간다 (왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전). 위아래 스크롤은 그대로
const SWIPE_MIN = 40; // 이만큼(px) 이상 옆으로 밀어야 넘긴다
export default function Rotator({
  slides,
  label,
  controlsClassName = "mt-4",
  onDark = false,
}: {
  slides: React.ReactNode[];
  label: string;
  controlsClassName?: string; // 넘기기 버튼 줄의 여백
  onDark?: boolean; // 어두운 강조 면(핫이슈 카드) 위에 놓일 때
}) {
  const arrow = `flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors ${
    onDark
      ? "text-white/75 hover:bg-white/10 hover:text-white"
      : "text-label-alt hover:bg-fill hover:text-label"
  }`;
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
  }, [n, paused, index]); // 손으로 넘기면 5초를 다시 센다

  const go = (i: number) => setIndex((i + n) % n);

  // 스와이프: 손가락이 움직인 거리로 판단. 옆으로 밀었으면 그 뒤 클릭(질문 열기)은 막는다
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || n < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    go(dx < 0 ? index + 1 : index - 1);
  }
  function onClickCapture(e: React.MouseEvent) {
    if (!swiped.current) return;
    swiped.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

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
      <div
        className="grid touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${n}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={`col-start-1 row-start-1 ${
              i === index
                ? "animate-[rotator-in_400ms_ease-out] opacity-100 motion-reduce:animate-none"
                : "pointer-events-none invisible opacity-0"
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
            className={arrow}
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
                  i === index
                    ? "w-5 bg-yes"
                    : onDark
                      ? "w-1.5 bg-white/35"
                      : "w-1.5 bg-fill-strong"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="다음 질문"
            className={arrow}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
