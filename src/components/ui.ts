// 공통 클래스 (디자인 C안: 먹색 채움 버튼, 흰 카드 + 1px 선(그림자 없음), 10px 모서리 탭. 기준: design/STYLEGUIDE.md)

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
  smallDanger: `${buttonBase} h-8 rounded-lg px-3 text-[14px] bg-danger text-white hover:opacity-90 disabled:opacity-50`,
  danger: `${buttonBase} h-12 rounded-xl px-5 text-[16px] bg-danger text-white hover:opacity-90 disabled:opacity-50`,
};

export const input =
  "w-full rounded-xl border border-line-neutral bg-surface px-3.5 py-3 t-body-2 text-label outline-none transition-colors placeholder:text-label-assist focus:border-brand focus:ring-2 focus:ring-brand/20";

// 카드: 1px 선 + 18px 모서리, 그림자 없음 (마우스 올림 때만 shadow-small)
export const card = "rounded-[18px] border border-line bg-surface";

// 칩(필터): 흰 칩 + 선, 선택되면 진한 채움 (10px 모서리)
export function chip(active: boolean) {
  return `inline-flex h-9 items-center whitespace-nowrap rounded-[10px] px-3.5 text-[14px] font-semibold transition-colors ${
    active
      ? "bg-inverse text-on-inverse"
      : "border border-line bg-surface text-label-neutral hover:bg-bg-alt"
  }`;
}

// 토글 탭: 회색 바 안에서 선택된 칸만 흰 바탕 (10px 모서리)
export const pillBar =
  "inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-bg-alt p-1";
export function textTab(active: boolean) {
  return `inline-flex h-9 items-center whitespace-nowrap rounded-[10px] px-4 text-[14px] font-bold transition-colors ${
    active
      ? "bg-surface text-label shadow-xsmall"
      : "text-label-neutral hover:text-label"
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
