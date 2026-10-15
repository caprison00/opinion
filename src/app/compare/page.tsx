import type { Metadata } from "next";
import { FeedbackForm, Shots } from "./Compare";

export const metadata: Metadata = {
  title: "디자인 의견",
  robots: { index: false, follow: false },
};

// 두 디자인 시안 비교 + 의견 받기. 어느 쪽에도 치우치지 않게 무채색으로 그린다.
export default function ComparePage() {
  return (
    <div className="min-h-dvh bg-zinc-100 text-zinc-900">
      <main className="mx-auto w-full max-w-[1060px] px-4 pb-20 pt-10 md:px-6">
        <p className="text-[13px] font-bold tracking-wide text-zinc-500">
          예감 · 디자인 의견 듣기
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight md:text-[32px]">
          두 디자인 중 어느 쪽이 더 끌리나요?
        </h1>
        <p className="mt-2 text-[15px] text-zinc-600">
          예감은 돈을 걸지 않고 미래 일을 확률로 예측하는 서비스예요. 1분이면
          돼요. 두 화면을 보고 아래 질문에 답해 주세요.
        </p>

        <div className="mt-8">
          <Shots />
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-[20px] font-extrabold">질문 3개</h2>
          <FeedbackForm />
        </section>
      </main>
    </div>
  );
}
