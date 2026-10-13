"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { button, chip, input } from "@/components/ui";
import { LEGAL_DRAFTS, LEGAL_KINDS, type LegalKind } from "@/lib/legal";
import { publishLegal, type PublishState } from "./actions";

const labelClass = "t-label-1 !font-semibold text-label-neutral";

export default function LegalForm({
  latest,
}: {
  latest: Record<LegalKind, { version: string; content: string } | null>;
}) {
  const [kind, setKind] = useState<LegalKind>("terms");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<PublishState, FormData>(
    publishLegal,
    {},
  );

  const last = latest[kind];
  const suggested = last ? nextVersion(last.version) : "1.0";

  useEffect(() => {
    if (versionRef.current) versionRef.current.value = suggested;
  }, [suggested]);

  function load(text: string) {
    if (!contentRef.current) return;
    if (
      contentRef.current.value.trim() &&
      !confirm("지금 쓰고 있는 내용을 바꿀까요?")
    ) {
      return;
    }
    contentRef.current.value = text;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        {LEGAL_KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={chip(kind === k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>버전 *</span>
          <input
            ref={versionRef}
            name="version"
            required
            defaultValue={suggested}
            className={input}
          />
          <span className="t-caption-1 text-label-alt">
            {last ? `현재 최신 버전 ${last.version}` : "첫 게시예요"}
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>시행일 (한국 시간)</span>
          <input type="datetime-local" name="effective_at" className={input} />
          <span className="t-caption-1 text-label-alt">
            비워 두면 바로 시행돼요.
          </span>
        </label>
      </div>

      {last && (
        <p className="rounded-lg bg-accent-orange px-3 py-2.5 t-caption-1 text-caution-text">
          내용을 바꾸는 개정이라면 시행일을 7일 뒤 이후로 정해 미리 알려야 해요.
          이용자에게 불리한 변경이면 30일 뒤 이후로 정하고 이메일로도 알려
          주세요.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={labelClass}>본문 *</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load(LEGAL_DRAFTS[kind])}
              className={button.smallSecondary}
            >
              초안 불러오기
            </button>
            {last && (
              <button
                type="button"
                onClick={() => load(last.content)}
                className={button.smallSecondary}
              >
                현재 버전 불러오기
              </button>
            )}
          </div>
        </div>
        <textarea
          ref={contentRef}
          name="content"
          required
          rows={18}
          placeholder="초안 불러오기를 누른 뒤 [대괄호] 부분을 채워 주세요."
          className={`${input} font-mono !text-[13px] leading-relaxed`}
        />
        <span className="t-caption-1 text-label-alt">
          “## 제목”, “### 소제목”, “- 목록”으로 쓰고 문단 사이는 한 줄 띄워요.
        </span>
      </div>

      {state.error && (
        <p className="t-label-1 text-negative-strong">{state.error}</p>
      )}
      {state.ok && (
        <p className="flex items-center gap-1.5 t-label-1 text-positive">
          <CheckCircleIcon className="h-4 w-4" />
          {state.ok}
        </p>
      )}

      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm("게시하면 시행 후에는 수정할 수 없어요. 게시할까요?")) {
            e.preventDefault();
          }
        }}
        className={`${button.primary} w-full`}
      >
        {pending ? "게시 중…" : "게시"}
      </button>
    </form>
  );
}

function nextVersion(v: string) {
  const parts = v.split(".").map(Number);
  if (parts.length === 1) parts.push(0);
  parts[parts.length - 1] += 1;
  return parts.join(".");
}
