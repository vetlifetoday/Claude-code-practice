"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input } from "@/components/ui";

export function MfaForm({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (listErr || !factor) {
      setBusy(false);
      setError("No authenticator app is set up for this account.");
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ""),
    });
    if (verifyErr) {
      setBusy(false);
      setError("That code didn't work. Check your authenticator app and try again.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onCancel() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="6-digit code" htmlFor="code">
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center text-lg tracking-[0.4em]"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Verifying…" : "Verify"}
      </Button>
      <button type="button" onClick={onCancel} className="w-full text-center text-sm text-navy-600 hover:underline">
        Use a different account
      </button>
    </form>
  );
}
