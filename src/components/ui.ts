// Wanted Design System 기준 공통 클래스

export const container = "mx-auto w-full max-w-[1060px] px-4 md:px-6";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed";

export const button = {
  primary: `${buttonBase} h-12 px-5 t-body-2 !font-semibold bg-primary text-white hover:bg-primary-strong active:bg-primary-heavy disabled:bg-fill disabled:text-label-disable`,
  secondary: `${buttonBase} h-12 px-5 t-body-2 !font-semibold border border-line-neutral bg-white text-label hover:bg-fill-alt active:bg-fill disabled:text-label-disable`,
  smallPrimary: `${buttonBase} h-8 rounded-lg px-3 t-label-2 !font-semibold bg-primary text-white hover:bg-primary-strong active:bg-primary-heavy`,
  smallSecondary: `${buttonBase} h-8 rounded-lg px-3 t-label-2 !font-semibold border border-line-neutral bg-white text-label hover:bg-fill-alt`,
};

export const input =
  "w-full rounded-lg border border-line-neutral bg-white px-3.5 py-3 t-body-2 text-label outline-none transition-colors placeholder:text-label-assist focus:border-primary";

export const card = "rounded-2xl border border-line bg-white";

export function chip(active: boolean) {
  return `inline-flex h-[38px] items-center whitespace-nowrap rounded-full px-4 t-label-1 !font-semibold transition-colors ${
    active
      ? "bg-inverse text-white"
      : "border border-line-neutral bg-white text-label-neutral hover:bg-fill-alt"
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
