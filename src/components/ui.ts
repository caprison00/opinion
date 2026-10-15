// 공통 클래스 (토스증권 공개 웹 레퍼런스 기반: 파랑 채움 버튼, 회색 채움 보조 버튼, 12·16px 모서리)

export const container = "mx-auto w-full max-w-[1060px] px-4 md:px-6";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-150 disabled:cursor-not-allowed";

export const button = {
  // 큰 버튼: 48px, 12px 모서리
  primary: `${buttonBase} h-12 rounded-xl px-5 text-[16px] bg-brand text-white hover:bg-brand-strong active:bg-brand-heavy disabled:bg-fill disabled:text-label-disable`,
  secondary: `${buttonBase} h-12 rounded-xl px-5 text-[16px] bg-fill text-label-neutral hover:bg-fill-strong active:bg-fill-strong disabled:text-label-disable`,
  // 작은 버튼: 32px, 8px 모서리, 14px/600
  smallPrimary: `${buttonBase} h-8 rounded-lg px-3 text-[14px] bg-brand text-white hover:bg-brand-strong active:bg-brand-heavy disabled:opacity-50`,
  smallSecondary: `${buttonBase} h-8 rounded-lg px-3 text-[14px] bg-fill text-label-neutral hover:bg-fill-strong disabled:opacity-50`,
  // 위험 동작 (삭제·아니오 판정)
  smallDanger: `${buttonBase} h-8 rounded-lg px-3 text-[14px] bg-negative-strong text-white hover:opacity-90 disabled:opacity-50`,
  danger: `${buttonBase} h-12 rounded-xl px-5 text-[16px] bg-negative-strong text-white hover:opacity-90 disabled:opacity-50`,
};

export const input =
  "w-full rounded-xl border border-line-neutral bg-surface px-3.5 py-3 t-body-2 text-label outline-none transition-colors placeholder:text-label-assist focus:border-brand focus:ring-2 focus:ring-brand/20";

// 카드: 얇은 선 + 16px 모서리, 그림자 없음
export const card = "rounded-2xl border border-line bg-surface";

// 칩(필터): 회색 채움 알약, 선택되면 진한 채움
export function chip(active: boolean) {
  return `inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[14px] font-semibold transition-colors ${
    active
      ? "bg-inverse text-on-inverse"
      : "bg-fill text-label-neutral hover:bg-fill-strong"
  }`;
}

// 텍스트 탭: 선택되면 진하게, 아니면 흐리게 (밑줄 없음)
export function textTab(active: boolean) {
  return `inline-flex h-10 items-center whitespace-nowrap rounded-lg px-2.5 text-[16px] transition-colors ${
    active
      ? "font-bold text-label"
      : "font-medium text-label-alt hover:bg-fill-alt hover:text-label-neutral"
  }`;
}

export function scoreText(score: number) {
  return score > 0 ? `+${score}` : String(score);
}

export function scoreColor(score: number) {
  if (score > 0) return "text-primary";
  if (score < 0) return "text-negative";
  return "text-label-alt";
}
