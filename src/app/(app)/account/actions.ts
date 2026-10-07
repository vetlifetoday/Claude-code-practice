"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";

export type FormState = { error?: string; success?: string };

export async function updateName(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_name", { p_full_name: String(formData.get("full_name") ?? "") });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { success: "Name saved." };
}

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?error=link");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password you haven't used here before." };
    if (error.code === "weak_password") return { error: "That password is too weak. Try a longer one." };
    return { error: error.message };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName) await supabase.rpc("update_my_name", { p_full_name: fullName });

  if (formData.get("redirect") === "1") redirect("/");
  return { success: "Password updated." };
}
