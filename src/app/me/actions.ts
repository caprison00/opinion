"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DeleteState = { error?: string };

// 회원 탈퇴: 계정과 프로필·예측·근거를 모두 지우고 로그아웃한다.
export async function deleteAccount(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  if (formData.get("confirm") !== "탈퇴") {
    return { error: "확인 칸에 “탈퇴”를 입력해 주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    return { error: "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  await supabase.auth.signOut();
  // 닉네임 확인 기억(middleware)도 지운다
  (await cookies()).delete("yg_profile");
  redirect("/?deleted=1");
}
