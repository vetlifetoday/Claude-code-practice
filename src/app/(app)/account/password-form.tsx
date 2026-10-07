"use client";

import { useActionState } from "react";
import { setPassword, type FormState } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function PasswordForm({ welcome, defaultName }: { welcome?: boolean; defaultName?: string }) {
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {welcome && (
        <>
          <input type="hidden" name="redirect" value="1" />
          <Field label="Your name" htmlFor="full_name">
            <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaultName} />
          </Field>
        </>
      )}
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <SubmitButton pendingText="Saving…">{welcome ? "Save and continue" : "Change password"}</SubmitButton>
    </form>
  );
}
