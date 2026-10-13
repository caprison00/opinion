"use server";

import { redirect } from "next/navigation";
import { splitVersions, type LegalDocument } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export type NicknameState = { error?: string };

export async function saveNickname(
  _prev: NicknameState,
  formData: FormData,
): Promise<NicknameState> {
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (nickname.length < 2 || nickname.length > 12) {
    return { error: "닉네임은 2~12자로 정해 주세요." };
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("profiles")
      .update({ nickname })
      .eq("id", user.id));
  } else {
    // 처음 가입: 만 14세 이상 확인과 약관 동의를 받고, 동의한 버전을 기록한다.
    if (formData.get("age") !== "on" || formData.get("terms") !== "on") {
      return { error: "필수 항목에 동의해 주세요." };
    }
    const { data: docs } = await supabase
      .from("legal_documents")
      .select("kind, version, effective_at");
    const all = (docs ?? []) as LegalDocument[];
    const currentVersion = (kind: string) =>
      splitVersions(all.filter((d) => d.kind === kind)).current?.version ??
      null;

    ({ error } = await supabase.from("profiles").insert({
      id: user.id,
      nickname,
      terms_version: currentVersion("terms"),
      privacy_version: currentVersion("privacy"),
      agreed_at: new Date().toISOString(),
    }));
  }

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 사용 중인 닉네임이에요." };
    }
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}
