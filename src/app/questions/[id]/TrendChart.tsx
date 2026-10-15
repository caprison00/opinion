import { formatDate } from "@/lib/questions";

// 선택지별 선 색 (OX는 예=파랑만 그린다)
const COLORS = [
  "var(--color-primary)",
  "var(--color-negative)",
  "var(--color-positive)",
  "var(--color-caution)",
  "var(--color-label-alt)",
];

const W = 600;
const H = 180;
const PAD = { top: 10, right: 8, bottom: 8, left: 46 };

export type TrendPoint = { t: string; crowd: number[] | null };

export default function TrendChart({
  points,
  options,
  type,
}: {
  points: TrendPoint[];
  options: string[];
  type: "ox" | "choice";
}) {
  const valid = points.filter(
    (p): p is { t: string; crowd: number[] } => !!p.crowd,
  );
  if (valid.length < 2) {
    return (
      <p className="rounded-xl bg-bg-alt py-8 text-center t-label-1 text-label-alt">
        예측이 더 쌓이면 추이가 보여요.
      </p>
    );
  }

  const t0 = new Date(points[0].t).getTime();
  const t1 = new Date(points[points.length - 1].t).getTime();
  const x = (t: string) =>
    PAD.left +
    ((new Date(t).getTime() - t0) / Math.max(1, t1 - t0)) *
      (W - PAD.left - PAD.right);
  const y = (p: number) => PAD.top + (1 - p) * (H - PAD.top - PAD.bottom);
  const lines = type === "ox" ? [0] : options.map((_, i) => i);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="집단 확률 추이"
      >
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--color-line)"
              strokeDasharray={g === 0.5 ? "4 4" : undefined}
            />
            <text
              x={PAD.left - 6}
              y={y(g) + 4}
              textAnchor="end"
              fontSize="14"
              fill="var(--color-label-alt)"
            >
              {g * 100}%
            </text>
          </g>
        ))}
        {lines.map((i) => (
          <polyline
            key={i}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={valid
              .map(
                (p) => `${x(p.t).toFixed(1)},${y(p.crowd[i] ?? 0).toFixed(1)}`,
              )
              .join(" ")}
          />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 t-caption-1 text-label-alt">
        <span>{formatDate(points[0].t)}</span>
        <span className="flex flex-wrap gap-3">
          {lines.map((i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {options[i]}
            </span>
          ))}
        </span>
        <span>{formatDate(points[points.length - 1].t)}</span>
      </figcaption>
    </figure>
  );
}
