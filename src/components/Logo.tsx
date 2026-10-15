import Link from "next/link";

// 예감 워드마크 (시안 A: "예"의 ㅇ을 70%가 채워진 확률 도넛으로 그림)
export function Wordmark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 100"
      className={className}
      role="img"
      aria-label="예감"
    >
      <circle
        cx="30"
        cy="50"
        r="19"
        fill="none"
        stroke="var(--color-brand)"
        strokeOpacity="0.22"
        strokeWidth="12"
      />
      <circle
        cx="30"
        cy="50"
        r="19"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="83.6 119.4"
        transform="rotate(-90 30 50)"
      />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M66 20 V80" />
        <path d="M56 40 H66 M56 60 H66" />
        <path d="M82 20 V80" />
        <path d="M102 24 H132 V48" />
        <path d="M152 18 V58 M152 38 H164" />
        <rect x="106" y="66" width="52" height="20" rx="3" />
      </g>
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className="flex items-center text-label"
      aria-label="예감 홈"
    >
      <Wordmark className={className ?? "h-8 w-auto md:h-9"} />
    </Link>
  );
}
