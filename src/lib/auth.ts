import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

export type Session = {
  userId: string;
  email: string;
  profile: Profile;
  role: AppRole;
  canEdit: boolean;
  isAdmin: boolean;
};

/**
 * Returns the signed-in user's session, or redirects:
 *  - not signed in            -> /login
 *  - MFA enrolled, not passed -> /login/mfa
 *  - deactivated account      -> /login?error=inactive
 * Cached per request so layouts and pages can both call it.
 */
export const requireSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const [{ data: mfaOk }, { data: profile }] = await Promise.all([
    // False when the user has an authenticator enrolled but hasn't entered a code yet.
    supabase.rpc("mfa_satisfied"),
    supabase.from("profiles").select("*").eq("id", claims.sub).single(),
  ]);
  if (mfaOk === false) redirect("/login/mfa");

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return {
    userId: claims.sub,
    email: profile.email,
    profile,
    role: profile.role,
    canEdit: profile.role === "admin" || profile.role === "staff",
    isAdmin: profile.role === "admin",
  };
});

/** Like requireSession, but also requires one of the given roles. */
export async function requireRole(...roles: AppRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/?denied=1");
  return session;
}

/** For server actions: returns an error message instead of redirecting. */
export async function checkRole(...roles: AppRole[]): Promise<Session | { error: string }> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    return { error: "You do not have permission to do that." };
  }
  return session;
}
