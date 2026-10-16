"use client";

/* eslint-disable @next/next/no-img-element -- 올리기 전 미리보기 */
import { useEffect, useRef, useState } from "react";
import { input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ImageFields } from "@/lib/images";

export const IMAGE_BUCKET = "question-images";
const MAX_WIDTH = 1200;
const MAX_FILE = 10 * 1024 * 1024;

const labelClass = "t-label-1 !font-semibold text-label-neutral";

// 고른 사진을 브라우저에서 가로 1200px 이하 webp로 줄인다
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("변환 실패"))),
      "image/webp",
      0.82,
    ),
  );
}

// 질문·이슈 묶음 폼의 이미지(선택) 칸: 사진 + 짧은 설명(화면 낭독용)
export default function ImageField({
  value,
  hint,
}: {
  value?: ImageFields;
  hint: string;
}) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const [url, setUrl] = useState(value?.image_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 새 질문 저장 후 폼이 비워지면 사진도 비운다
  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => {
      setUrl(value?.image_url ?? "");
      setError("");
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [value?.image_url]);

  // 저장 뒤 서버에서 새 값이 오면 그 사진으로 맞춘다 (저장하면 폼이 초기화되며 예전 값으로 돌아가는 것 방지)
  useEffect(() => {
    setUrl(value?.image_url ?? "");
  }, [value?.image_url]);

  // 사진을 올리는 중에는 폼을 저장하지 못하게 막는다 (사진 없이 저장되는 것 방지)
  useEffect(() => {
    if (!busy) return;
    const form = ref.current?.closest("form");
    const block = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      setError("사진을 올리는 중이에요. 다 올라간 뒤 저장해 주세요.");
    };
    form?.addEventListener("submit", block, true);
    return () => form?.removeEventListener("submit", block, true);
  }, [busy]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/"))
      return setError("이미지 파일만 올릴 수 있어요.");
    if (file.size > MAX_FILE) return setError("10MB 이하 사진을 골라 주세요.");
    setBusy(true);
    try {
      const blob = await shrink(file);
      const supabase = createClient();
      const path = `${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, blob, { contentType: "image/webp" });
      if (upErr) throw upErr;
      setUrl(
        supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
      );
    } catch {
      setError("사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset ref={ref} className="flex flex-col gap-2">
      <legend className={`mb-2 ${labelClass}`}>이미지 (선택)</legend>
      <input type="hidden" name="image_url" value={url} />
      {url ? (
        <div className="flex flex-col gap-2">
          <img
            src={url}
            alt="고른 이미지 미리보기"
            className="aspect-[2/1] w-full rounded-xl bg-fill object-cover"
          />
          <div className="flex gap-2">
            <label className="cursor-pointer rounded-lg bg-fill px-3 py-1.5 t-label-2 !font-semibold text-label-neutral hover:bg-fill-strong">
              다른 사진으로
              <input
                type="file"
                accept="image/*"
                onChange={onPick}
                className="sr-only"
              />
            </label>
            {busy && (
              <span className="self-center t-label-2 text-label-alt">
                올리는 중…
              </span>
            )}
            <button
              type="button"
              onClick={() => setUrl("")}
              className="rounded-lg px-3 py-1.5 t-label-2 !font-semibold text-negative-strong hover:bg-fill"
            >
              사진 빼기
            </button>
          </div>
        </div>
      ) : (
        <label className="flex aspect-[4/1] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-neutral bg-bg-alt text-center hover:bg-fill">
          <span className="t-label-1 !font-semibold text-label">
            {busy ? "올리는 중…" : "사진 고르기"}
          </span>
          <span className="t-caption-1 text-label-alt">
            가로로 긴 사진이 잘 어울려요 · 자동으로 줄여서 올려요
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            disabled={busy}
            className="sr-only"
          />
        </label>
      )}
      {error && <p className="t-caption-1 text-negative-strong">{error}</p>}

      {url && (
        <div className="mt-1">
          <label className="flex flex-col gap-1.5">
            <span className="t-label-2 !font-semibold text-label-neutral">
              사진 설명 (화면 낭독용)
            </span>
            <input
              name="image_alt"
              maxLength={100}
              defaultValue={value?.image_alt ?? ""}
              placeholder="예: 관중이 가득 찬 e스포츠 경기장"
              className={input}
            />
          </label>
        </div>
      )}
      <p className="t-caption-1 text-label-alt">{hint}</p>
    </fieldset>
  );
}
