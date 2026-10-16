"use client";

import { useEffect, useRef, useState } from "react";

// 질문 공유: 모바일은 휴대폰 공유 창(카카오톡·문자 등), PC는 링크 복사 + SNS 메뉴.
// 공유 문구에는 집단 확률이나 내 예측을 넣지 않는다 (여론 공개 규칙).
export default function ShareButton({
  questionId,
  title,
}: {
  questionId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const url = () => `${window.location.origin}/questions/${questionId}`;
  const text = `${title} — 당신의 예감은?`;

  async function onClick() {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, text, url: url() });
      } catch {
        // 공유 창을 닫은 경우: 아무것도 하지 않는다
      }
      return;
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사해 주세요", url());
    }
  }

  function popup(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
    setOpen(false);
  }

  const enc = encodeURIComponent;
  const targets = [
    {
      label: "X",
      href: () =>
        `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url())}`,
    },
    {
      label: "페이스북",
      href: () => `https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`,
    },
    {
      label: "스레드",
      href: () =>
        `https://www.threads.net/intent/post?text=${enc(`${text} ${url()}`)}`,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-neutral bg-surface px-3 t-label-2 !font-semibold text-label-neutral transition-colors hover:bg-fill hover:text-label"
      >
        <ShareIcon />
        공유
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-[14px] border border-line bg-surface p-1.5 shadow-medium"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left t-label-1 !font-semibold text-label hover:bg-fill"
          >
            {copied ? "링크를 복사했어요" : "링크 복사"}
          </button>
          <div className="my-1 h-px bg-line-alt" />
          {targets.map((t) => (
            <button
              key={t.label}
              type="button"
              role="menuitem"
              onClick={() => popup(t.href())}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-left t-label-1 text-label-neutral hover:bg-fill hover:text-label"
            >
              {t.label}에 공유
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="m16 6-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
