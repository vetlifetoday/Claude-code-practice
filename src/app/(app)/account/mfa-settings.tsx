"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";

type Factor = { id: string; friendly_name?: string; status: string; created_at: string };

export function MfaSettings() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors((data?.all ?? []).filter((f) => f.factor_type === "totp") as Factor[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data on mount
    load();
  }, [load]);

  const verified = factors?.filter((f) => f.status === "verified") ?? [];

  async function startEnroll() {
    setError(null);
    setMessage(null);
    setBusy(true);
    const supabase = createClient();
    // Clean up abandoned, never-verified attempts first.
    for (const f of factors ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Could not start setup.");
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);
    if (error) {
      setError("That code didn't work. Make sure your phone's clock is correct and try again.");
      return;
    }
    setEnrolling(null);
    setCode("");
    setMessage("Two-step verification is on. You'll be asked for a code each time you sign in.");
    await load();
    router.refresh();
  }

  async function remove(factorId: string) {
    if (!confirm("Turn off two-step verification for your account?")) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Two-step verification is off.");
    await load();
    router.refresh();
  }

  if (factors === null) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="flex items-center gap-2 text-sm">
        Status:{" "}
        {verified.length > 0 ? <Badge tone="green">On</Badge> : <Badge tone="amber">Off</Badge>}
      </div>

      {verified.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3 text-sm">
          <span>{f.friendly_name || "Authenticator app"}</span>
          <Button variant="secondary" size="sm" onClick={() => remove(f.id)} disabled={busy}>
            Turn off
          </Button>
        </div>
      ))}

      {verified.length === 0 && !enrolling && (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Add a second step at sign-in using a free authenticator app such as Google Authenticator,
            Microsoft Authenticator, or 1Password. Strongly recommended for administrators.
          </p>
          <Button onClick={startEnroll} disabled={busy}>
            Set up authenticator app
          </Button>
        </div>
      )}

      {enrolling && (
        <form onSubmit={confirmEnroll} className="space-y-4 rounded-md border border-navy-200 bg-navy-50 p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Open your authenticator app and scan this QR code.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from Supabase */}
          <img src={enrolling.qr} alt="QR code for your authenticator app" className="size-44 rounded bg-white p-2" />
          <p className="text-xs text-slate-600">
            Can&apos;t scan? Enter this key manually: <code className="break-all font-mono">{enrolling.secret}</code>
          </p>
          <Field label="6-digit code" htmlFor="mfa-code">
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="max-w-40 text-center tracking-[0.3em]"
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Turn on
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEnrolling(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
