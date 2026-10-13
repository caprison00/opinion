"use server";

import { redirect } from "next/navigation";
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

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, nickname });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 사용 중인 닉네임이에요." };
    }
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}
