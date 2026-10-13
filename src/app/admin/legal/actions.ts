"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import {
  compareVersions,
  isLegalKind,
  LEGAL_KINDS,
  type LegalDocument,
} from "@/lib/legal";

export type PublishState = { error?: string; ok?: string };

function parseKst(value: FormDataEntryValue | null) {
  const s = String(value ?? "");
  if (!s) return new Date(); // 비워 두면 즉시 시행
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const date = new Date(`${s}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function publishLegal(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const { supabase, user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) return { error: "관리자만 게시할 수 있어요." };

  const kind = formData.get("kind");
  const version = String(formData.get("version") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const effectiveAt = parseKst(formData.get("effective_at"));

  if (!isLegalKind(kind)) return { error: "문서 종류를 골라 주세요." };
  if (!/^\d+(\.\d+)*$/.test(version)) {
    return { error: "버전은 1.0, 1.1 처럼 숫자와 점으로 써 주세요." };
  }
  if (!content) return { error: "본문을 입력해 주세요." };
  if (!effectiveAt) return { error: "시행일을 확인해 주세요." };
  if (effectiveAt.getTime() < Date.now() - 60_000) {
    return { error: "시행일은 지금 이후로 정해 주세요." };
  }

  // 초안의 [대괄호] 자리를 채우지 않고 게시하는 것을 막는다.
  const placeholder = content.match(/\[[^\]\n]{1,40}\]/);
  if (placeholder) {
    return {
      error: `채우지 않은 칸이 있어요: ${placeholder[0]}`,
    };
  }

  const { data: existing } = await supabase
    .from("legal_documents")
    .select("version")
    .eq("kind", kind);
  const versions = ((existing ?? []) as Pick<LegalDocument, "version">[]).map(
    (d) => d.version,
  );
  if (versions.some((v) => compareVersions(version, v) <= 0)) {
    return { error: "이전 버전보다 높은 버전 번호를 써 주세요." };
  }

  const { error } = await supabase.from("legal_documents").insert({
    kind,
    version,
    content,
    effective_at: effectiveAt.toISOString(),
  });
  if (error) return { error: `게시에 실패했어요: ${error.message}` };

  revalidateLegal();
  return { ok: `버전 ${version}을 게시했어요.` };
}

export async function deleteScheduledLegal(formData: FormData) {
  const { supabase, isAdmin } = await getViewer();
  if (!isAdmin) return;
  const id = String(formData.get("id") ?? "");
  // 시행 전 버전만 지워진다 (DB 정책으로도 막혀 있음).
  await supabase
    .from("legal_documents")
    .delete()
    .eq("id", id)
    .gt("effective_at", new Date().toISOString());
  revalidateLegal();
}

function revalidateLegal() {
  revalidatePath("/admin/legal");
  for (const k of LEGAL_KINDS) revalidatePath(k.path);
}
