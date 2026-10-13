export type Category = "sports" | "economy";
export type QuestionStatus = "open" | "closed" | "resolved" | "void";

export type Question = {
  id: string;
  title: string;
  description: string;
  category: Category;
  resolution_source: string;
  close_at: string;
  resolve_at: string;
  status: QuestionStatus;
  outcome: "yes" | "no" | null;
  created_at: string;
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "sports", label: "스포츠" },
  { value: "economy", label: "경제" },
];

export function categoryLabel(category: Category) {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((c) => c.value === value);
}

const STATUS_LABELS: Record<QuestionStatus, string> = {
  open: "진행 중",
  closed: "마감",
  resolved: "판정 완료",
  void: "무효",
};

// status가 open이어도 마감 시각이 지났으면 마감으로 보여준다.
export function statusLabel(q: Pick<Question, "status" | "close_at">) {
  if (q.status === "open" && new Date(q.close_at) <= new Date()) return "마감";
  return STATUS_LABELS[q.status];
}

// 국내 공직선거·정당 지지도 질문을 막기 위한 금지어 (CLAUDE.md 규제 가드레일)
const BANNED_WORDS = [
  "선거",
  "대선",
  "총선",
  "지선",
  "보궐",
  "재보선",
  "정당",
  "지지율",
  "지지도",
  "당대표",
  "도지사",
  "교육감",
  "민주당",
  "국민의힘",
  "조국혁신당",
  "개혁신당",
  "진보당",
];

export function findBannedWord(text: string) {
  return BANNED_WORDS.find((w) => text.includes(w));
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

// 마감까지 남은 시간을 "3일 남음" 처럼 짧게 보여준다.
export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "마감";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}분 남음`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 남음`;
  return `${Math.floor(hours / 24)}일 남음`;
}
