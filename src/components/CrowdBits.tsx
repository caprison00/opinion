import { LockIcon, UserIcon } from "./icons";

// 참여자 수: 사람 아이콘 + 숫자 (읽을 때는 "N명 예측")
export function Participants({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      aria-label={`${n}명 예측`}
    >
      <UserIcon className="h-3.5 w-3.5" />
      {n}
    </span>
  );
}

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

export function Locked({ text = "참여하면 보여요" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 t-label-2 text-label-alt">
      <LockIcon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

// OX 확률 눈금 (C안): 0(아니오) ~ 100(예) 눈금 위에 모두의 위치를 막대로 표시
// yes = '예'의 집단 확률(0~100). 예측 전에는 이 부품을 그리지 않고 LockedScale을 쓴다 (여론 공개 규칙).
export function OxBar({
  yes,
  options,
}: {
  yes: number; // 0~100
  options: string[];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between t-label-2 !font-bold">
        <span className="text-no-ink">
          {options[1]} <span className="tabular-nums">{100 - yes}%</span>
        </span>
        <span className="text-yes-ink">
          {options[0]} <span className="num-m">{yes}%</span>
        </span>
      </div>
      <ProbScale value={yes} className="mt-2" />
    </div>
  );
}

// 눈금 막대만: 아니오 쪽 → 가운데 50 → 예 쪽, value 위치에 진한 막대
export function ProbScale({
  value,
  className = "",
}: {
  value: number; // 0~100
  className?: string;
}) {
  return (
    <div
      className={`relative h-2 rounded-full bg-[linear-gradient(90deg,var(--c-no-track),var(--c-fill-strong)_50%,var(--c-yes-track))] ${className}`}
      role="img"
      aria-label={`예 ${value}%`}
    >
      <span className="absolute left-1/2 top-[-3px] h-3.5 w-0.5 -translate-x-1/2 bg-line-neutral" />
      <span
        className="absolute top-[-5px] h-[18px] w-1 -translate-x-1/2 rounded-sm bg-label"
        style={{ left: `${value}%` }}
      />
    </div>
  );
}

// 예측 전 가림 막대 (숫자 없이 빗금만)
export function LockedScale({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-2 rounded-full bg-[repeating-linear-gradient(90deg,var(--c-fill-strong)_0_6px,var(--c-fill)_6px_12px)] ${className}`}
    />
  );
}
