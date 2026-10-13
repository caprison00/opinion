import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleLoginButton from "./GoogleLoginButton";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-bold">예감</h1>
        <p className="mt-2 text-gray-600">
          미래를 확률로 예측하고, 적중 점수를 쌓아보세요.
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          로그인에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
      <GoogleLoginButton />
    </main>
  );
}
