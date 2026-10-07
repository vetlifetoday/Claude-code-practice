"use server";

import { createClient } from "@/lib/supabase/server";

export async function requestReset(_prev: { sent: boolean }, formData: FormData): Promise<{ sent: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const supabase = await createClient();
    // The email template links to /auth/confirm; we never reveal whether the account exists.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/account/set-password`,
    });
  }
  return { sent: true };
}
