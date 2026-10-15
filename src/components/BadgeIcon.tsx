import { badgeDef, badgeTitle, BADGES, type BadgeFamily } from "@/lib/badges";

// 게임 문양 스타일 뱃지
// - 틀: 계열별 모양 (적중 방패 · 습관 육각형 · 기여 메달 · 역발상 별)
// - 재질: 단계별 금속 (브론즈 · 실버 · 골드), 단계 없는 뱃지는 전용 보석 색
// - 그림: 뱃지마다 의미를 담은 문양
// - 움직임: 빛 훑기(모두), 반짝임·발광(골드·특별). 움직임 줄이기 설정이면 멈춘다 (globals.css)

type Tone = {
  rim: [string, string, string]; // 테두리 금속 (어두움 → 밝음 → 어두움)
  face: [string, string]; // 안쪽 판
  glyph: [string, string]; // 문양 (밝음 → 진함)
  glow?: string; // 발광 색 (골드·특별)
};

const TONES: Record<string, Tone> = {
  bronze: {
    rim: ["#5a2d12", "#e0a070", "#7a3f1d"],
    face: ["#2a1a12", "#4a2a18"],
    glyph: ["#ffe2c4", "#d98a4e"],
  },
  silver: {
    rim: ["#4d5866", "#f4f7fb", "#7d8796"],
    face: ["#1c2430", "#33404f"],
    glyph: ["#ffffff", "#b9c4d2"],
  },
  gold: {
    rim: ["#7a4f00", "#ffe896", "#b07d10"],
    face: ["#1e1a10", "#3c2f0e"],
    glyph: ["#fff6d0", "#f2b62a"],
    glow: "rgba(255, 196, 64, 0.75)",
  },
  jade: {
    rim: ["#0c4a37", "#9ff0cc", "#13775a"],
    face: ["#0b211b", "#123a2f"],
    glyph: ["#e6fff4", "#4fd6a0"],
    glow: "rgba(80, 220, 160, 0.6)",
  },
  royal: {
    rim: ["#7a4f00", "#ffe896", "#b07d10"],
    face: ["#22104a", "#3d1f7a"],
    glyph: ["#fff6d0", "#d8b8ff"],
    glow: "rgba(190, 140, 255, 0.75)",
  },
  ruby: {
    rim: ["#6a0a22", "#ffb3c4", "#a3163a"],
    face: ["#2a0812", "#4d0f22"],
    glyph: ["#fff0f3", "#ff6f91"],
    glow: "rgba(255, 90, 130, 0.7)",
  },
  muted: {
    rim: ["#9aa1ab", "#d5d9df", "#a9afb8"],
    face: ["#c7ccd3", "#b5bbc4"],
    glyph: ["#eef0f3", "#dde1e6"],
  },
};

const SPECIAL: Record<string, string> = {
  first_step: "jade",
  season_master: "royal",
  sharpshooter: "ruby",
};

// 별·꽃 모양 틀 꼭짓점 (반지름을 번갈아)
function starPath(points: number, outer: number, inner: number, rot = -90) {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    return `${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

const FRAMES: Record<BadgeFamily, string> = {
  hit: "M24 2.5 L42.5 8.5 V22.5 C42.5 34 34.5 41.5 24 45.5 C13.5 41.5 5.5 34 5.5 22.5 V8.5 Z",
  habit: "M24 2.5 L42.6 13.25 V34.75 L24 45.5 L5.4 34.75 V13.25 Z",
  contrib: starPath(14, 22.5, 19.8),
  contrarian: starPath(8, 23, 15.5, -90),
};

// 뱃지별 문양 (48 x 48 기준, 가운데 24,24)
function Glyph({ k, fill }: { k: string; fill: string }) {
  const s = {
    fill: "none",
    stroke: fill,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (k) {
    case "hits": // 과녁 정중앙에 꽂힌 화살
      return (
        <g>
          <circle cx="23" cy="25" r="8.5" {...s} strokeWidth="2" />
          <circle cx="23" cy="25" r="4.5" {...s} strokeWidth="2" />
          <circle cx="23" cy="25" r="1.8" fill={fill} />
          <path d="M34 14 L24.5 23.5" {...s} strokeWidth="2.2" />
          <path
            d="M34 14 L34.5 18.5 M34 14 L29.5 13.5"
            {...s}
            strokeWidth="2"
          />
        </g>
      );
    case "hit_streak": // 이어서 오르는 세 겹 화살촉
      return (
        <g {...s} strokeWidth="2.8">
          <path d="M15.5 22 L24 14.5 L32.5 22" />
          <path d="M15.5 28.5 L24 21 L32.5 28.5" opacity="0.8" />
          <path d="M15.5 35 L24 27.5 L32.5 35" opacity="0.6" />
        </g>
      );
    case "season_master": // 왕관
      return (
        <g>
          <path
            d="M14 30.5 L12 17.5 L19 23 L24 13.5 L29 23 L36 17.5 L34 30.5 Z"
            fill={fill}
          />
          <rect x="14" y="32" width="20" height="3.2" rx="1.2" fill={fill} />
          <circle cx="12" cy="17" r="1.6" fill={fill} />
          <circle cx="24" cy="13" r="1.6" fill={fill} />
          <circle cx="36" cy="17" r="1.6" fill={fill} />
        </g>
      );
    case "daily": // 꺼지지 않는 불꽃
      return (
        <g>
          <path
            d="M24 11.5 C26.5 17 31.5 19.5 31.5 26.5 C31.5 31.5 28.2 35.5 24 35.5 C19.8 35.5 16.5 31.8 16.5 27.5 C16.5 23.5 19.2 21.2 20.6 17.2 C21.8 20 22.8 21 24 22 C25.2 19 24.8 15 24 11.5 Z"
            fill={fill}
          />
          <path
            d="M24 24 C25.5 27 27.5 28 27.5 30.5 C27.5 32.6 26 34 24 34 C22 34 20.5 32.6 20.5 30.6 C20.5 28.3 22.6 27 24 24 Z"
            fill="#000"
            opacity="0.28"
          />
        </g>
      );
    case "variety": // 사방을 가리키는 나침반
      return (
        <g>
          <path
            d="M24 10.5 L27 21 L37.5 24 L27 27 L24 37.5 L21 27 L10.5 24 L21 21 Z"
            fill={fill}
          />
          <path
            d="M24 16 L25.5 22.5 L32 24 L25.5 25.5 L24 32 L22.5 25.5 L16 24 L22.5 22.5 Z"
            fill="#000"
            opacity="0.22"
            transform="rotate(45 24 24)"
          />
          <circle cx="24" cy="24" r="2.2" fill="#000" opacity="0.35" />
        </g>
      );
    case "first_step": // 막 돋아난 새싹
      return (
        <g>
          <path d="M24 35 V24.5" {...s} strokeWidth="2.4" />
          <path
            d="M24 26 C23.5 20 19 17.5 14.5 18.2 C14.6 23.5 18.6 26.6 24 26 Z"
            fill={fill}
          />
          <path
            d="M24 23.5 C24.5 17 29.5 13.8 34 14.6 C33.8 20.4 29.6 23.8 24 23.5 Z"
            fill={fill}
          />
          <path d="M16.5 35.5 H31.5" {...s} strokeWidth="2.2" opacity="0.7" />
        </g>
      );
    case "liked": // 하트가 담긴 말풍선
      return (
        <g>
          <path
            d="M13 15.5 a3 3 0 0 1 3-3 h16 a3 3 0 0 1 3 3 v12 a3 3 0 0 1-3 3 h-8 l-5.5 5 v-5 h-2.5 a3 3 0 0 1-3-3 z"
            fill={fill}
          />
          <path
            d="M24 27.5 C19.5 24.3 18 22.4 18 20.3 C18 18.6 19.4 17.4 20.9 17.4 C22.3 17.4 23.3 18.2 24 19.3 C24.7 18.2 25.7 17.4 27.1 17.4 C28.6 17.4 30 18.6 30 20.3 C30 22.4 28.5 24.3 24 27.5 Z"
            fill="#000"
            opacity="0.38"
          />
        </g>
      );
    case "early": // 산 정상에 먼저 꽂은 깃발
      return (
        <g>
          <path
            d="M11.5 35 L20.5 22.5 L24.5 27.5 L28.5 22 L36.5 35 Z"
            fill={fill}
          />
          <path d="M24.5 27.5 V12" {...s} strokeWidth="2" />
          <path d="M24.5 12 L32.5 14.8 L24.5 17.6 Z" fill={fill} />
        </g>
      );
    case "reasoner": // 깃펜
      return (
        <g>
          <path
            d="M33.5 11 C25 13 18.5 20.5 17.5 31 L19.5 33 C29 31 35.5 23 33.5 11 Z"
            fill={fill}
          />
          <path
            d="M16 35.5 L28 20"
            {...s}
            strokeWidth="1.8"
            stroke="#000"
            opacity="0.4"
          />
          <path d="M13 36.5 H22" {...s} strokeWidth="2" />
        </g>
      );
    case "minority": // 군중(작은 점) 사이에서 홀로 빛나는 별
      return (
        <g>
          <path
            d={starPath(5, 9.5, 4, -90)}
            fill={fill}
            transform="translate(4 1)"
          />
          <circle cx="13" cy="17" r="1.7" fill={fill} opacity="0.45" />
          <circle cx="13" cy="24" r="1.7" fill={fill} opacity="0.45" />
          <circle cx="13" cy="31" r="1.7" fill={fill} opacity="0.45" />
          <circle cx="18" cy="35" r="1.7" fill={fill} opacity="0.45" />
        </g>
      );
    case "contrarian": // 군중(흐린 화살표)은 내려갈 때 홀로 거슬러 오르는 화살표
      return (
        <g {...s}>
          <path
            d="M14.5 14 V27 M11 23.5 L14.5 27 L18 23.5"
            strokeWidth="2.2"
            opacity="0.45"
          />
          <path
            d="M21.5 18 V31 M18 27.5 L21.5 31 L25 27.5"
            strokeWidth="2.2"
            opacity="0.45"
          />
          <path d="M31 36 V13.5 M25 19.5 L31 13.5 L37 19.5" strokeWidth="3.4" />
        </g>
      );
    case "sharpshooter": // 조준점 위의 보석
      return (
        <g>
          <path
            d="M15.5 20.5 L19.5 14 H28.5 L32.5 20.5 L24 34.5 Z"
            fill={fill}
          />
          <path
            d="M15.5 20.5 H32.5 M19.5 14 L21.8 20.5 L24 34.5 L26.2 20.5 L28.5 14"
            fill="none"
            stroke="#000"
            strokeOpacity="0.32"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M24 8.5 V11.5 M24 37 V40 M9.5 24 H12.5 M35.5 24 H38.5"
            {...s}
            strokeWidth="1.8"
            opacity="0.8"
          />
        </g>
      );
    default:
      return <circle cx="24" cy="24" r="6" fill={fill} />;
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
  muted?: boolean; // 아직 못 받은 뱃지 (회색, 움직임 없음)
}) {
  const def = badgeDef(badgeKey);
  if (!def) return null;
  const single = def.thresholds.length === 1;
  const toneName = muted
    ? "muted"
    : single
      ? (SPECIAL[badgeKey] ?? "gold")
      : (["bronze", "bronze", "silver", "gold"][level] ?? "bronze");
  const t = TONES[toneName];
  const fancy = !muted && !!t.glow; // 골드·특별: 반짝임 + 발광
  const id = `bdg-${badgeKey}-${toneName}`;
  const frame = FRAMES[def.family];
  // 뱃지마다 박자를 어긋나게 (한 화면에서 동시에 번쩍이지 않도록)
  const delay = `${(BADGES.findIndex((b) => b.key === badgeKey) * 0.37) % 3.6}s`;
  const title = muted
    ? `${def.name} (아직 못 받음)`
    : badgeTitle(badgeKey, level);

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={`shrink-0 overflow-visible ${fancy ? "badge-glow" : ""}`}
      style={
        {
          "--glow": t.glow ?? "transparent",
          animationDelay: delay,
        } as React.CSSProperties
      }
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.rim[1]} />
          <stop offset="0.45" stopColor={t.rim[2]} />
          <stop offset="0.7" stopColor={t.rim[0]} />
          <stop offset="1" stopColor={t.rim[1]} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor={t.face[1]} />
          <stop offset="1" stopColor={t.face[0]} />
        </radialGradient>
        <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.glyph[0]} />
          <stop offset="1" stopColor={t.glyph[1]} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={frame} />
        </clipPath>
      </defs>

      {/* 금속 테두리 + 안쪽 판 */}
      <path d={frame} fill={`url(#${id}-rim)`} />
      <path
        d={frame}
        fill={`url(#${id}-face)`}
        transform="translate(24 24) scale(0.8) translate(-24 -24)"
      />
      <path
        d={frame}
        fill="none"
        stroke={t.rim[1]}
        strokeOpacity="0.55"
        strokeWidth="0.8"
        transform="translate(24 24) scale(0.8) translate(-24 -24)"
      />

      {/* 문양 */}
      <g transform="translate(24 24) scale(0.82) translate(-24 -24)">
        <Glyph k={badgeKey} fill={`url(#${id}-glyph)`} />
      </g>

      {/* 빛이 훑고 지나가는 띠 */}
      {!muted && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect
            className="badge-shine"
            x="-4"
            y="-6"
            width="12"
            height="60"
            fill={`url(#${id}-shine)`}
            style={{ animationDelay: delay }}
          />
        </g>
      )}

      {/* 반짝임 (골드·특별) */}
      {fancy && (
        <g fill="#fff">
          <path
            className="badge-twinkle"
            d="M39 7 L40 10 L43 11 L40 12 L39 15 L38 12 L35 11 L38 10 Z"
            style={{ animationDelay: delay }}
          />
          <path
            className="badge-twinkle"
            d="M9 33 L9.7 35.3 L12 36 L9.7 36.7 L9 39 L8.3 36.7 L6 36 L8.3 35.3 Z"
            style={{ animationDelay: `calc(${delay} + 1.2s)` }}
          />
        </g>
      )}
    </svg>
  );
}
