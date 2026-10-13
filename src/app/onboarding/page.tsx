import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import NicknameForm from "./NicknameForm";

export const metadata = { title: "닉네임" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthShell>
      <h1 className="mt-8 t-title-3">
        {profile ? "닉네임 변경" : "닉네임을 정해 주세요"}
      </h1>
      <p className="mt-2 t-body-3 text-label-alt">
        랭킹과 근거 목록에 표시돼요.
      </p>
      <div className="mt-8">
        <NicknameForm initial={profile?.nickname} />
      </div>
    </AuthShell>
  );
}
