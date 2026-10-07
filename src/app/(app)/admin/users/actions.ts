"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const roleSchema = z.enum(["admin", "staff", "viewer"]);

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function inviteUser(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await checkRole("admin");
  if ("error" in session) return { ok: false, error: session.error };

  const parsed = z
    .object({
      email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
      full_name: z.string().trim().max(120),
      role: roleSchema,
    })
    .safeParse({
      email: String(formData.get("email") ?? "").trim(),
      full_name: formData.get("full_name") ?? "",
      role: formData.get("role"),
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, full_name, role } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${siteUrl()}/account/set-password`,
  });
  if (error) {
    if (error.code === "email_exists") return { ok: false, error: "Someone with that email already has an account." };
    return { ok: false, error: error.message };
  }

  // Profile row is created by a database trigger; now set the chosen role.
  const supabase = await createClient();
  const { error: roleErr } = await supabase.from("profiles").update({ role, full_name: full_name || null }).eq("id", data.user.id);
  if (roleErr) return { ok: false, error: `Invited, but could not set the role: ${friendlyError(roleErr)}` };
  await supabase.rpc("log_event", { p_action: "invite", p_entity_type: "profiles", p_summary: `Invited ${email} as ${role}` });

  revalidatePath("/admin/users");
  return { ok: true, message: `Invitation sent to ${email}.` };
}

export async function updateUser(userId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await checkRole("admin");
  if ("error" in session) return { ok: false, error: session.error };

  const role = roleSchema.safeParse(formData.get("role"));
  if (!role.success) return { ok: false, error: "Choose a role." };
  const isActive = formData.get("is_active") === "on";

  if (userId === session.userId && (role.data !== "admin" || !isActive)) {
    return { ok: false, error: "You can't remove your own admin access. Ask another admin." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("is_active").eq("id", userId).single();
  const { error } = await supabase.from("profiles").update({ role: role.data, is_active: isActive }).eq("id", userId);
  if (error) return { ok: false, error: friendlyError(error) };

  // Deactivated users are also blocked from signing in at all.
  if (before && before.is_active !== isActive) {
    const { error: banErr } = await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (banErr) return { ok: false, error: `Saved, but sign-in access could not be changed: ${banErr.message}` };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "Saved." };
}

export async function resendInvite(email: string): Promise<{ error?: string }> {
  const session = await checkRole("admin");
  if ("error" in session) return session;
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/account/set-password`,
  });
  if (error) return { error: error.message };
  return {};
}

/** For someone who lost their phone: removes their authenticator so they can sign in and set it up again. */
export async function resetMfa(userId: string): Promise<{ error?: string }> {
  const session = await checkRole("admin");
  if ("error" in session) return session;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) return { error: error.message };
  for (const f of data.factors) {
    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    if (delErr) return { error: delErr.message };
  }
  revalidatePath("/admin/users");
  return {};
}
