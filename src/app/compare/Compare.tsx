"use client";

import { useActionState, useEffect, useState } from "react";
import { sendFeedback, type FeedbackState } from "./actions";

// 비교 페이지는 어느 시안에도 치우치지 않도록 무채색으로만 그린다.
type Page = "home" | "detail";
type View = "pc" | "mobile";

function Seg<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full bg-zinc-200 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${
            value === it.value
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Shots() {
  const [page, setPage] = useState<Page>("home");
  const [view, setView] = useState<View>("pc");

  // 휴대폰으로 열면 모바일 화면부터 보여준다
  useEffect(() => {
    if (window.innerWidth < 768) setView("mobile");
  }, []);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <Seg
          value={page}
          onChange={setPage}
          items={[
            { value: "home", label: "메인" },
            { value: "detail", label: "질문 상세" },
          ]}
        />
        <Seg
          value={view}
          onChange={setView}
          items={[
            { value: "pc", label: "PC 화면" },
            { value: "mobile", label: "모바일 화면" },
          ]}
        />
      </div>
      <p className="mt-2 text-[13px] text-zinc-500">
        같은 내용을 두 디자인으로 그렸어요. 이미지 안을 스크롤하면 아래까지 볼
        수 있고, 누르면 크게 볼 수 있어요.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        {(["a", "b"] as const).map((k) => (
          <figure key={k} className="min-w-0">
            <figcaption className="mb-2 text-[17px] font-extrabold text-zinc-900">
              {k.toUpperCase()}안
            </figcaption>
            <div
              className={`overflow-y-auto rounded-xl border border-zinc-300 bg-white ${
                view === "mobile" ? "mx-auto max-w-[390px]" : ""
              }`}
              style={{ maxHeight: "70vh" }}
            >
              <a
                href={`/compare/${k}-${page}-${view}.webp`}
                target="_blank"
                rel="noopener"
                title="크게 보기"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/compare/${k}-${page}-${view}.webp`}
                  alt={`${k.toUpperCase()}안 ${page === "home" ? "메인" : "질문 상세"} ${
                    view === "pc" ? "PC" : "모바일"
                  } 화면`}
                  className="block h-auto w-full"
                  loading="lazy"
                />
              </a>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Choice({ name, label }: { name: string; label: string }) {
  return (
    <fieldset>
      <legend className="text-[15px] font-bold text-zinc-900">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { value: "A", text: "A안" },
          { value: "B", text: "B안" },
          { value: "same", text: "비슷해요" },
        ].map((o) => (
          <label
            key={o.value}
            className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white text-[15px] font-semibold text-zinc-700 transition-colors has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              required
              className="sr-only"
            />
            {o.text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const field =
  "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900";

export function FeedbackForm() {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    sendFeedback,
    {},
  );
  const [device, setDevice] = useState("pc");
  useEffect(() => {
    if (window.innerWidth < 768) setDevice("mobile");
  }, []);

  if (state.done) {
    return (
      <div className="rounded-xl bg-white p-6 text-center">
        <p className="text-[18px] font-extrabold text-zinc-900">
          고마워요! 의견이 전달됐어요.
        </p>
        <p className="mt-1 text-[14px] text-zinc-500">이 창은 닫아도 돼요.</p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-6 rounded-xl bg-white p-5 md:p-6"
    >
      <input type="hidden" name="device" value={device} />
      {/* 봇 방지용 숨은 칸 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <label className="block">
        <span className="text-[15px] font-bold text-zinc-900">
          1. 이 서비스, 어떤 서비스처럼 보이나요?
        </span>
        <input
          name="looks_like"
          maxLength={200}
          placeholder="예: 뉴스 앱 같아요, 투자 앱 같아요, 게임 같아요"
          className={field}
        />
      </label>
      <Choice
        name="want_click"
        label="2. 어느 쪽에서 예측 버튼을 누르고 싶나요? *"
      />
      <Choice name="trust" label="3. 어느 쪽이 더 믿음이 가나요? *" />
      <label className="block">
        <span className="text-[15px] font-bold text-zinc-900">
          4. 하고 싶은 말 (선택)
        </span>
        <textarea
          name="comment"
          rows={3}
          maxLength={500}
          placeholder="좋았던 점, 어색한 점 무엇이든"
          className={`${field} resize-y`}
        />
      </label>
      {state.error && (
        <p className="text-[14px] font-semibold text-red-600">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-lg bg-zinc-900 text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "보내는 중…" : "의견 보내기"}
      </button>
      <p className="-mt-3 text-center text-[12px] text-zinc-500">
        이름이나 연락처는 받지 않아요. 응답은 디자인을 정하는 데만 써요.
      </p>
    </form>
  );
}
