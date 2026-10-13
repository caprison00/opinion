import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NicknameForm from "./NicknameForm";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">
          {profile ? "닉네임 변경" : "닉네임을 정해 주세요"}
        </h1>
        <p className="mt-2 text-gray-600">랭킹과 근거 목록에 표시돼요.</p>
      </div>
      <NicknameForm initial={profile?.nickname} />
    </main>
  );
}
