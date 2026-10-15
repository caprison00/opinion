import { LockIcon } from "./icons";

// 24시간 변화량 (%p). 볼 수 없으면 아무것도 그리지 않는다 (여론 공개 규칙).
export function Change({
  value,
  className = "",
}: {
  value: number | null;
  className?: string;
}) {
  if (value === null) return null;
  if (value === 0) {
    return (
      <span className={`t-caption-1 text-label-alt ${className}`}>
        24시간 변화 없음
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`t-caption-1 !font-semibold tabular-nums ${
        up ? "text-positive" : "text-negative"
      } ${className}`}
      title="24시간 변화량"
    >
      {up ? "▲" : "▼"}
      {Math.abs(value)}%p
    </span>
  );
}

export function Locked({ text = "예측하면 보여요" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 t-label-2 text-label-alt">
      <LockIcon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

// OX 진영 막대: 예(파랑) / 아니오(빨강)
export function OxBar({
  yes,
  options,
}: {
  yes: number; // 0~100
  options: string[];
}) {
  return (
    <div>
      <div className="flex justify-between t-label-2 !font-semibold">
        <span className="text-primary">
          {options[0]} <span className="tabular-nums">{yes}%</span>
        </span>
        <span className="text-negative">
          {options[1]} <span className="tabular-nums">{100 - yes}%</span>
        </span>
      </div>
      <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
        <div className="bg-primary" style={{ width: `${yes}%` }} />
        <div className="flex-1 bg-negative/70" />
      </div>
    </div>
  );
}
