import type { SupabaseClient } from "@supabase/supabase-js";

// 티어 마크 (이번 시즌 누적 점수 상위 %). 비율·컷 계산은 DB 함수 tier_for가 한다.
export type Tier =
  | "master"
  | "diamond"
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "newbie";

export const TIERS: { value: Tier; label: string; rule: string }[] = [
  { value: "master", label: "마스터", rule: "상위 1%" },
  { value: "diamond", label: "다이아", rule: "상위 5%" },
  { value: "platinum", label: "플래티넘", rule: "상위 15%" },
  { value: "gold", label: "골드", rule: "상위 35%" },
  { value: "silver", label: "실버", rule: "상위 60%" },
  { value: "bronze", label: "브론즈", rule: "나머지" },
  { value: "newbie", label: "새내기", rule: "이번 시즌 판정 3건 미만" },
];

export const SEASON_MIN = 3; // 누적 점수 랭킹·티어 대상
export const ACCURACY_MIN = 10; // 정확도 랭킹 대상

export function isTier(v: unknown): v is Tier {
  return TIERS.some((t) => t.value === v);
}

export function tierLabel(tier: Tier) {
  return TIERS.find((t) => t.value === tier)?.label ?? "새내기";
}

// 여러 사용자의 이번 시즌 티어
export async function getTiers(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, Tier>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const { data } = await supabase.rpc("user_tiers", { p_ids: unique });
  for (const r of (data ?? []) as { user_id: string; tier: string }[]) {
    map.set(r.user_id, isTier(r.tier) ? r.tier : "newbie");
  }
  return map;
}

// 순위 → "상위 N%" (올림, 최소 1%)
export function topPercent(rank: number, total: number) {
  if (!total) return null;
  return Math.max(1, Math.ceil((rank / total) * 100));
}

export function seasonLabel(season: string) {
  const [y, m] = season.split("-");
  return `${y}년 ${Number(m)}월`;
}
