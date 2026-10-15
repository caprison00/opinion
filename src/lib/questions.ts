export type Category =
  | "sports"
  | "economy"
  | "culture"
  | "tech"
  | "game"
  | "life";

export type QuestionStatus = "open" | "closed" | "resolved" | "void";

export type QuestionType = "ox" | "choice";

export type Question = {
  id: string;
  title: string;
  description: string;
  category: Category;
  resolution_source: string;
  open_at: string;
  close_at: string;
  resolve_at: string;
  status: QuestionStatus;
  type: QuestionType;
  options: string[];
  outcome: "yes" | "no" | null;
  outcome_index: number | null;
  issue_id: string | null;
  resolved_at?: string | null;
  created_at: string;
};

export const OX_OPTIONS = ["예", "아니오"];
export const CHOICE_MIN = 3;
export const CHOICE_MAX = 5;

// 확신도 (객관식): 고른 선택지에 들어가는 확률
export const CONFIDENCE_LEVELS = [
  { value: "low", label: "낮음", p: 0.5 },
  { value: "mid", label: "보통", p: 0.7 },
  { value: "high", label: "높음", p: 0.9 },
] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]["value"];

export const OX_QUICK_P = 0.7;

// 고른 선택지에 p, 나머지는 똑같이 나눈다. 합이 정확히 1이 되도록 마지막 칸에서 맞춘다.
export function buildProbs(n: number, chosen: number, p: number) {
  const rest = (1 - p) / (n - 1);
  const probs = Array.from({ length: n }, (_, i) =>
    i === chosen ? p : Math.round(rest * 10000) / 10000,
  );
  const lastOther = chosen === n - 1 ? n - 2 : n - 1;
  const others = probs.reduce((a, v, i) => (i === chosen ? a : a + v), 0);
  probs[lastOther] =
    Math.round((probs[lastOther] + (1 - p - others)) * 10000) / 10000;
  return probs;
}

// 예측(probs)을 "예 70%"처럼 가장 높은 선택지와 그 확률로 보여준다.
export function stanceOf(probs: number[], options: string[]) {
  let best = 0;
  probs.forEach((v, i) => {
    if (v > probs[best]) best = i;
  });
  return {
    index: best,
    label: options[best] ?? "",
    pct: Math.round(Number(probs[best]) * 100),
  };
}

export function outcomeLabel(q: Pick<Question, "options" | "outcome_index">) {
  return q.outcome_index === null ? null : (q.options[q.outcome_index] ?? null);
}

// 화면에 보이는 순서 (CLAUDE.md '분야' 참고)
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "sports", label: "스포츠" },
  { value: "economy", label: "경제·재테크" },
  { value: "culture", label: "연예·컬처" },
  { value: "tech", label: "테크·AI" },
  { value: "game", label: "게임·e스포츠" },
  { value: "life", label: "생활·트렌드" },
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
export function statusLabel(
  q: Pick<Question, "status" | "close_at" | "options" | "outcome_index">,
) {
  if (q.status === "open" && new Date(q.close_at) <= new Date()) return "마감";
  const outcome = outcomeLabel(q);
  if (q.status === "resolved" && outcome) return `결과 ${outcome}`;
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

// 예측을 받을 수 있는 상태인지 (DB의 question_is_accepting과 같은 기준)
export function isAccepting(q: Pick<Question, "status" | "close_at">) {
  return q.status === "open" && new Date(q.close_at) > new Date();
}
