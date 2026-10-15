import { badgeDef, badgeTitle, type BadgeFamily } from "@/lib/badges";

// 단계 색: 브론즈·실버·골드. 단계 없는 뱃지는 호박색
const LEVEL_COLOR = ["", "#a0623a", "#7d8796", "#c9971c"];

// 계열별 그림: 적중 과녁, 습관 달력, 기여 말풍선, 역발상 화살표
function Glyph({ family }: { family: BadgeFamily }) {
  switch (family) {
    case "hit":
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
        </g>
      );
    case "habit":
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <rect x="6.5" y="7.5" width="11" height="10" rx="2" />
          <path d="M6.5 11h11M9.5 6v3M14.5 6v3" />
        </g>
      );
    case "contrib":
      return (
        <path
          d="M7 8.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-3.2L9 17.5v-2.5a2 2 0 0 1-2-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "contrarian":
      return (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 15V8m0 0-2.5 2.5M8 8l2.5 2.5" />
          <path d="M16 9v7m0 0-2.5-2.5M16 16l2.5-2.5" />
        </g>
      );
  }
}

export default function BadgeIcon({
  badgeKey,
  level,
  size = 18,
  muted = false,
}: {
  badgeKey: string;
  level: number;
  size?: number;
  muted?: boolean; // 아직 못 받은 뱃지 (진열장에서 흐리게)
}) {
  const def = badgeDef(badgeKey);
  if (!def) return null;
  const single = def.thresholds.length === 1;
  const ring = muted
    ? "var(--color-label-disable)"
    : single
      ? "var(--color-accent)"
      : LEVEL_COLOR[level] || LEVEL_COLOR[1];
  const title = muted
    ? `${def.name} (아직 못 받음)`
    : badgeTitle(badgeKey, level);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className="shrink-0"
      style={{
        color: muted ? "var(--color-label-assist)" : "var(--color-label)",
      }}
    >
      <title>{title}</title>
      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill={muted ? "var(--color-bg-alt)" : "var(--color-surface)"}
        stroke={ring}
        strokeWidth="2"
      />
      <Glyph family={def.family} />
    </svg>
  );
}
