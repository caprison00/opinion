import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">예감</h1>
        {user ? (
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-500 underline">로그아웃</button>
          </form>
        ) : (
          <Link href="/login" className="text-sm font-medium underline">
            로그인
          </Link>
        )}
      </header>

      <section className="mt-10 rounded-2xl bg-gray-50 p-6">
        {profile ? (
          <>
            <p className="text-lg">
              <strong>{profile.nickname}</strong>님, 환영해요!
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-block text-sm text-gray-500 underline"
            >
              닉네임 변경
            </Link>
          </>
        ) : (
          <p className="text-gray-600">
            로그인하면 예측에 참여할 수 있어요.
          </p>
        )}
        <p className="mt-6 text-sm text-gray-400">
          질문 목록은 다음 단계에서 추가됩니다.
        </p>
      </section>
    </main>
  );
}
