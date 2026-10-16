"use client";

import { useRef, useState } from "react";
import { SNS_PATHS } from "./snsIcons";

// 질문 공유 아이콘 줄. 공유 문구에는 집단 확률이나 내 예측을 넣지 않는다 (여론 공개 규칙).
// - 인스타그램·틱톡: 웹 공유 주소가 없어서, 휴대폰은 공유 창 / PC는 링크 복사 후 안내
// - 카카오톡: 카카오 앱 키가 있으면 카카오 공유, 없으면 휴대폰 공유 창 / PC는 링크 복사
// - X·스레드·링크드인·텔레그램: 각 서비스의 공유 창
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const KAKAO_SRI =
  "sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka";

type KakaoSdk = {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendScrap(o: { requestUrl: string }): void };
};

function loadKakao(): Promise<KakaoSdk> {
  const w = window as unknown as { Kakao?: KakaoSdk };
  if (w.Kakao) return Promise.resolve(w.Kakao);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = KAKAO_SDK;
    s.integrity = KAKAO_SRI;
    s.crossOrigin = "anonymous";
    s.onload = () => (w.Kakao ? resolve(w.Kakao) : reject());
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

type Target = {
  key: keyof typeof SNS_PATHS | "link";
  label: string;
  bg: string;
  fg: string;
};

const TARGETS: Target[] = [
  {
    key: "instagram",
    label: "인스타그램",
    bg: "linear-gradient(45deg,#f9a825,#e4405f 45%,#a033c8)",
    fg: "#fff",
  },
  { key: "kakaotalk", label: "카카오톡", bg: "#fee500", fg: "#191919" },
  { key: "tiktok", label: "틱톡", bg: "#000", fg: "#fff" },
  { key: "x", label: "X", bg: "#000", fg: "#fff" },
  { key: "threads", label: "스레드", bg: "#000", fg: "#fff" },
  { key: "linkedin", label: "링크드인", bg: "#0a66c2", fg: "#fff" },
  { key: "telegram", label: "텔레그램", bg: "#26a5e4", fg: "#fff" },
  {
    key: "link",
    label: "링크 복사",
    bg: "var(--color-fill)",
    fg: "var(--color-label)",
  },
];

export default function ShareButton({
  questionId,
  title,
}: {
  questionId: string;
  title: string;
}) {
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const url = () => `${window.location.origin}/questions/${questionId}`;
  const text = `${title} — 당신의 예감은?`;
  const enc = encodeURIComponent;

  function say(msg: string) {
    setNotice(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3500);
  }

  async function copy(after?: string) {
    try {
      await navigator.clipboard.writeText(url());
      say(after ? `링크를 복사했어요. ${after}` : "링크를 복사했어요.");
    } catch {
      window.prompt("링크를 복사해 주세요", url());
    }
  }

  // 휴대폰이면 공유 창을 열고 true, 아니면 false
  async function nativeShare() {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch || !navigator.share) return false;
    try {
      await navigator.share({ title, text, url: url() });
    } catch {
      // 공유 창을 닫은 경우
    }
    return true;
  }

  function popup(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=680");
  }

  async function onShare(t: Target) {
    switch (t.key) {
      case "instagram":
      case "tiktok":
        if (!(await nativeShare())) {
          copy(`${t.label} 앱의 DM·스토리·게시물에 붙여넣어 주세요.`);
        }
        return;
      case "kakaotalk":
        if (KAKAO_KEY) {
          try {
            const k = await loadKakao();
            if (!k.isInitialized()) k.init(KAKAO_KEY);
            k.Share.sendScrap({ requestUrl: url() });
            return;
          } catch {
            // 카카오 공유를 못 쓰면 아래로
          }
        }
        if (!(await nativeShare())) {
          copy("카카오톡 대화창에 붙여넣어 주세요.");
        }
        return;
      case "x":
        return popup(
          `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url())}`,
        );
      case "threads":
        return popup(
          `https://www.threads.net/intent/post?text=${enc(`${text} ${url()}`)}`,
        );
      case "linkedin":
        return popup(
          `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url())}`,
        );
      case "telegram":
        return popup(
          `https://t.me/share/url?url=${enc(url())}&text=${enc(text)}`,
        );
      case "link":
        return copy();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap items-center gap-2" aria-label="공유하기">
        {TARGETS.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              onClick={() => onShare(t)}
              title={t.label === "링크 복사" ? t.label : `${t.label}에 공유`}
              aria-label={
                t.label === "링크 복사" ? t.label : `${t.label}에 공유`
              }
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                t.bg === "#000" ? "ring-1 ring-inset ring-white/25" : ""
              }`}
              style={{ background: t.bg, color: t.fg }}
            >
              {t.key === "link" ? (
                <LinkIcon />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d={SNS_PATHS[t.key]} />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p
        aria-live="polite"
        className="min-h-[1.25rem] t-caption-1 text-positive"
      >
        {notice}
      </p>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
