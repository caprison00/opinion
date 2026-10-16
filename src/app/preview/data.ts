// 디자인 테스트용 견본 데이터 (실제 DB와 무관)

export const FEATURED = {
  issue: "2026 롤드컵",
  category: "게임·e스포츠",
  title: "2026 롤드컵 우승팀이 LCK 팀일까?",
  highlight: "LCK 팀일까?",
  closeIn: "D-16",
  participants: 1284,
  reactions: 342,
  yes: 63,
  delta: 8,
  context: [
    "LCK 4팀이 모두 8강에 올랐어요.",
    "T1은 3연패, 젠지는 첫 우승에 도전해요.",
    "결승은 11월 9일 서울에서 열려요.",
  ],
  source: "LoL e스포츠 공식 홈페이지 결승 결과",
};

export const MOVING = [
  {
    title: "이번 주 코스피가 3,000을 넘을까?",
    category: "경제·재테크",
    yes: 41,
    delta: -12,
    locked: false,
  },
  {
    title: "손흥민이 이번 시즌 리그 10골 이상을 넣을까?",
    category: "스포츠",
    yes: 0,
    delta: 0,
    locked: true,
  },
  {
    title: "11월까지 새 AI 모델이 공개될까?",
    category: "테크·AI",
    yes: 72,
    delta: 9,
    locked: false,
  },
];

export const RESOLVED = [
  { title: "원/달러 환율이 월말에 1,400원 아래일까?", result: "예", hit: 12 },
  {
    title: "이 영화가 개봉 2주 안에 300만 관객을 넘을까?",
    result: "아니오",
    hit: 64,
  },
];

export const CARDS = [
  {
    title: "올해 롤드컵 우승팀은?",
    category: "게임·e스포츠",
    type: "객관식 4",
    top: "T1",
    pct: 45,
    delta: 15,
    closeIn: "D-5",
    n: 812,
  },
  {
    title: "11월 30일까지 서울에 첫눈이 관측될까?",
    category: "생활·트렌드",
    type: "OX",
    top: "예",
    pct: 38,
    delta: -4,
    closeIn: "D-39",
    n: 233,
  },
  {
    title: "연말 비트코인이 1억 5천만 원 이상일까?",
    category: "경제·재테크",
    type: "OX",
    top: "",
    pct: 0,
    delta: 0,
    closeIn: "D-69",
    n: 590,
  },
  {
    title: "이 곡이 빌보드 핫100에 오를까?",
    category: "연예·컬처",
    type: "OX",
    top: "예",
    pct: 57,
    delta: 3,
    closeIn: "D-12",
    n: 147,
  },
];

export const TRENDING = [
  "올해 롤드컵 우승팀은?",
  "이번 주 코스피가 3,000을 넘을까?",
  "손흥민이 이번 시즌 리그 10골 이상을 넣을까?",
  "2026 롤드컵 우승팀이 LCK 팀일까?",
  "연말 비트코인이 1억 5천만 원 이상일까?",
];

export const UPCOMING = [
  { when: "10월 19일 (일)", title: "이번 주 코스피가 3,000을 넘을까?" },
  { when: "10월 24일 (토)", title: "올해 롤드컵 우승팀은?" },
  { when: "10월 27일 (화)", title: "이 곡이 빌보드 핫100에 오를까?" },
];

// 상세: 집단 확률 추이 (전체 / 내 예측)
export const TREND = {
  crowd: [50, 52, 55, 54, 58, 57, 60, 59, 61, 62, 60, 63],
  mine: [null, null, null, 70, 70, 70, 75, 75, 75, 80, 80, 80] as (
    | number
    | null
  )[],
  labels: ["10/4", "10/15"],
};

export const COMMENTS = [
  {
    nick: "슈퍼예측가",
    tier: "마스터",
    stance: "y" as const,
    pct: 80,
    ago: "2시간 전",
    body: "LCK 4팀이 다 8강이면 확률상 한 팀은 결승 가요. 메타도 LCK 스타일이에요.",
    r: [42, 3, 1],
  },
  {
    nick: "예측왕김씨",
    tier: "다이아",
    stance: "n" as const,
    pct: 65,
    ago: "5시간 전",
    body: "LPL 1시드 폼이 너무 좋아요. 국제전 다전제는 변수가 많아서 아니오로 예측해요.",
    r: [18, 9, 4],
  },
  {
    nick: "새벽코딩",
    tier: "새내기",
    stance: "y" as const,
    pct: 70,
    ago: "1일 전",
    body: "홈 그라운드 결승이라 응원 효과도 있다고 봐요.",
    r: [6, 2, 0],
  },
];
