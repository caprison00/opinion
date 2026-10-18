"use client";

import { Children, useEffect, useRef, useState } from "react";

// 목록을 처음엔 step개만 보여주고, 아래에 닿으면 step개씩 더 펼친다 (무한 스크롤).
// 항목은 서버에서 한꺼번에 받아 두고 화면에서만 잘라 보여준다(화면 이동 없음).
// 자동으로 안 될 때를 위해 "더 보기" 버튼도 둔다.
export default function RevealList({
  children,
  step = 12,
  className = "",
  moreLabel,
  moreClassName = "",
}: {
  children: React.ReactNode;
  step?: number;
  className?: string;
  moreLabel: string;
  moreClassName?: string;
}) {
  const items = Children.toArray(children);
  const [count, setCount] = useState(step);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = items.length > count;

  useEffect(() => {
    const el = sentinel.current;
    if (!hasMore || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + step);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, step, count]);

  return (
    <>
      <div className={className}>{items.slice(0, count)}</div>
      {hasMore && (
        <div ref={sentinel} className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setCount((c) => c + step)}
            className={moreClassName}
          >
            {moreLabel}
          </button>
        </div>
      )}
    </>
  );
}
