import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import GoogleLoginButton from "./GoogleLoginButton";

export const metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <AuthShell>
      <h1 className="mt-8 t-title-3">
        미래를 확률로 예측하고, 점수를 쌓아보세요
      </h1>
      <p className="mt-2 t-body-3 text-label-alt">
        돈은 걸지 않아요. 예측이 맞을수록 점수와 랭킹이 올라가요.
      </p>
      {error && (
        <p className="mt-6 rounded-lg bg-accent-red px-4 py-3 t-label-1 text-negative-strong">
          로그인에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
      <div className="mt-8">
        <GoogleLoginButton />
      </div>
    </AuthShell>
  );
}
