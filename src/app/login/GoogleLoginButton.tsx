"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleLoginButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      onClick={signIn}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-800 shadow-sm active:bg-gray-50"
    >
      구글로 계속하기
    </button>
  );
}
