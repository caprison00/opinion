"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";

export async function setHidden(formData: FormData) {
  const { supabase, isAdmin } = await getViewer();
  if (!isAdmin) return;
  await supabase.rpc("set_comment_hidden", {
    p_comment_id: String(formData.get("id") ?? ""),
    p_hidden: formData.get("hidden") === "true",
  });
  revalidatePath("/admin/reports");
}

export async function removeComment(formData: FormData) {
  const { supabase, isAdmin } = await getViewer();
  if (!isAdmin) return;
  await supabase
    .from("comments")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/reports");
}
