import type { SupabaseClient } from "@supabase/supabase-js";

// 뱃지 12종 (DB의 badges 표와 같은 내용). 표시용 기록이며 무엇과도 바꿀 수 없다.
export type BadgeFamily = "hit" | "habit" | "contrib" | "contrarian";

export type BadgeDef = {
  key: string;
  family: BadgeFamily;
  name: string;
  description: string;
  thresholds: number[]; // 단계별 기준 (단계 없는 뱃지는 [1])
  unit: string;
};

export const BADGES: BadgeDef[] = [
  {
    key: "hits",
    family: "hit",
    name: "명중",
    description: "판정된 질문을 맞힌 횟수",
    thresholds: [5, 30, 100],
    unit: "회",
  },
  {
    key: "hit_streak",
    family: "hit",
    name: "연속 적중",
    description: "판정 순서대로 연달아 맞힌 횟수",
    thresholds: [3, 5, 10],
    unit: "연속",
  },
  {
    key: "season_master",
    family: "hit",
    name: "시즌 마스터",
    description: "한 달 시즌을 마스터 티어로 마감",
    thresholds: [1],
    unit: "회",
  },
  {
    key: "daily",
    family: "habit",
    name: "꾸준한 예측가",
    description: "연속으로 예측한 날 수",
    thresholds: [3, 7, 30],
    unit: "일",
  },
  {
    key: "variety",
    family: "habit",
    name: "다방면",
    description: "판정된 예측이 있는 분야 수",
    thresholds: [3, 6, 9],
    unit: "개 분야",
  },
  {
    key: "first_step",
    family: "habit",
    name: "첫 발걸음",
    description: "첫 예측을 남김",
    thresholds: [1],
    unit: "",
  },
  {
    key: "liked",
    family: "contrib",
    name: "공감 받는 근거",
    description: "내 댓글이 받은 리액션 합계",
    thresholds: [10, 50, 200],
    unit: "개",
  },
  {
    key: "early",
    family: "contrib",
    name: "선발대",
    description: "공개 후 24시간 안에 먼저 예측한 질문 수",
    thresholds: [5, 20, 50],
    unit: "회",
  },
  {
    key: "reasoner",
    family: "contrib",
    name: "토론가",
    description: "근거를 적은 예측 수",
    thresholds: [10, 50, 150],
    unit: "회",
  },
  {
    key: "minority",
    family: "contrarian",
    name: "소수파 적중",
    description: "30% 미만만 맞힌 질문을 맞힌 횟수",
    thresholds: [1, 5, 20],
    unit: "회",
  },
  {
    key: "contrarian",
    family: "contrarian",
    name: "역발상",
    description: "집단과 반대로 예측해서 맞힌 횟수",
    thresholds: [1, 5, 20],
    unit: "회",
  },
  {
    key: "sharpshooter",
    family: "contrarian",
    name: "족집게",
    description: "단 10% 미만만 맞힌 질문을 맞힌 횟수",
    thresholds: [1],
    unit: "회",
  },
];

export const FAMILY_LABEL: Record<BadgeFamily, string> = {
  hit: "적중",
  habit: "습관",
  contrib: "기여",
  contrarian: "역발상",
};

export const LEVEL_LABEL = ["", "브론즈", "실버", "골드"];

export function badgeDef(key: string) {
  return BADGES.find((b) => b.key === key);
}

// "명중 실버" / 단계 없는 뱃지는 이름만
export function badgeTitle(key: string, level: number) {
  const def = badgeDef(key);
  if (!def) return "";
  return def.thresholds.length > 1 && level > 0
    ? `${def.name} ${LEVEL_LABEL[level]}`
    : def.name;
}

// 다음 단계까지 남은 양 (다 받았으면 null)
export function nextGoal(def: BadgeDef, level: number, progress: number) {
  const next = def.thresholds.at(level);
  if (next === undefined) return null;
  return { target: next, left: Math.max(0, next - progress) };
}

export type UserBadge = {
  badge_key: string;
  level: number;
  progress: number;
  seen_level: number;
  earned_at: string | null;
};

export type FeaturedBadge = { key: string; level: number };

// 닉네임 옆에 붙일 대표 뱃지
export async function getFeaturedBadges(
  supabase: SupabaseClient,
  ids: string[],
) {
  const map = new Map<string, FeaturedBadge>();
  const unique = [...new Set(ids)];
  if (!unique.length) return map;
  const { data } = await supabase.rpc("featured_badges", { p_ids: unique });
  for (const r of (data ?? []) as {
    user_id: string;
    badge_key: string;
    level: number;
  }[]) {
    map.set(r.user_id, { key: r.badge_key, level: r.level });
  }
  return map;
}

// 판정된 질문 하나로 채운 뱃지 조건 (소수파 적중·족집게). DB 계산과 같은 기준.
export function questionBadgeKeys(
  hit: boolean,
  participants: number,
  hitRate: number | null,
) {
  if (!hit || hitRate === null) return [];
  const keys: string[] = [];
  if (participants >= 10 && hitRate < 0.3) keys.push("minority");
  if (participants >= 20 && hitRate < 0.1) keys.push("sharpshooter");
  return keys;
}
