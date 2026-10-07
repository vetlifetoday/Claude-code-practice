import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaForm } from "./mfa-form";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Two-step verification</h1>
      <p className="mb-6 text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
      <MfaForm next={next} />
    </>
  );
}
