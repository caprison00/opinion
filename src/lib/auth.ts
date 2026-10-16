import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// 한 번의 화면 요청 안에서는 결과를 같이 쓴다 (헤더·본문·뱃지 안내가 각자 로그인 확인을 하지 않게)
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: !!admin };
});
