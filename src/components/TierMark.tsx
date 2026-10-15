import { tierLabel, type Tier } from "@/lib/tiers";

// 닉네임 앞에 붙는 티어 마크. 색은 globals.css의 --tier-* (라이트·다크 각각)
export default function TierMark({
  tier,
  size = "sm",
}: {
  tier: Tier;
  size?: "sm" | "md";
}) {
  const label = tierLabel(tier);
  const sizeClass =
    size === "md"
      ? "h-6 px-2 t-label-2 gap-1"
      : "h-[18px] px-1.5 text-[11px] gap-0.5";
  if (tier === "newbie") {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-md bg-fill !font-semibold leading-none text-label-alt ${sizeClass}`}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md !font-bold leading-none ${sizeClass}`}
      style={{
        color: `var(--tier-${tier})`,
        backgroundColor: `color-mix(in srgb, var(--tier-${tier}) 14%, transparent)`,
      }}
      title={`이번 시즌 티어: ${label}`}
    >
      <svg
        viewBox="0 0 10 10"
        className="h-[0.8em] w-[0.8em]"
        aria-hidden="true"
      >
        <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}
