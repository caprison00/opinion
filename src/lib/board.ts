import type { ImageFields } from "./images";
import type { SupabaseClient } from "@supabase/supabase-js";

// question_board(DB 함수)의 결과. 집단 확률·24시간 전 확률은 볼 수 있을 때만 들어온다.
export type Board = {
  participants: number;
  crowd: number[] | null;
  crowdPrev: number[] | null;
  reactions: number;
  hitRate: number | null;
};

type BoardRow = {
  question_id: string;
  participants: number;
  crowd: (number | string)[] | null;
  crowd_prev: (number | string)[] | null;
  reactions: number;
  hit_rate: number | string | null;
};

export const EMPTY_BOARD: Board = {
  participants: 0,
  crowd: null,
  crowdPrev: null,
  reactions: 0,
  hitRate: null,
};

export async function getBoards(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, Board>();
  if (!ids.length) return map;
  const { data } = await supabase.rpc("question_board", {
    p_ids: [...new Set(ids)],
  });
  for (const r of (data ?? []) as BoardRow[]) {
    map.set(r.question_id, {
      participants: r.participants,
      crowd: r.crowd?.map(Number) ?? null,
      crowdPrev: r.crowd_prev?.map(Number) ?? null,
      reactions: r.reactions,
      hitRate: r.hit_rate === null ? null : Number(r.hit_rate),
    });
  }
  return map;
}

// 선택지 i의 24시간 변화량(%p). 24시간 전에 예측이 없었으면 균등 확률에서 출발한 것으로 본다.
export function changeOf(board: Board, i: number) {
  if (!board.crowd) return null;
  const n = board.crowd.length;
  const before = board.crowdPrev?.[i] ?? 1 / n;
  return Math.round((board.crowd[i] - before) * 100);
}

// 지금 예측해서 정답을 맞혔을 때 남은 기간에서 받을 수 있는 최대 점수
// (OX 99%, 객관식 확신도 높음 90% 기준. 예측 전 기간은 집단 확률로 따로 계산된다.)
export function maxGainNow(
  q: { open_at: string; close_at: string; type: "ox" | "choice" },
  n: number,
) {
  const t0 = new Date(q.open_at).getTime();
  const t1 = new Date(q.close_at).getTime();
  const now = Date.now();
  if (t1 <= now || t1 <= t0) return 0;
  const remain = Math.min(1, (t1 - Math.max(now, t0)) / (t1 - t0));
  const p = q.type === "ox" ? 0.99 : 0.9;
  const rest = (1 - p) / (n - 1);
  const brier = (1 - p) ** 2 + (n - 1) * rest ** 2;
  const best = (1 - brier / (1 - 1 / n)) * 100;
  return Math.round(best * remain);
}

// KST 기준 이번 시즌 (YYYY-MM)
export function currentSeason() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export type Issue = {
  id: string;
  title: string;
  context_lines: string[];
  context_source_url: string | null;
  created_at: string;
} & ImageFields;
