// 토론: 감정 리액션 3종 (CLAUDE.md '토론'에서 확정)
export const REACTIONS = [
  { value: "confident", label: "확신해요" },
  { value: "anxious", label: "불안해요" },
  { value: "absurd", label: "말도 안 돼" },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["value"];

export const COMMENT_MAX = 500;
export const AUTO_HIDE_REPORTS = 5;

// "방금", "3분 전", "2시간 전", "4일 전", 그 이상은 날짜
export function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
