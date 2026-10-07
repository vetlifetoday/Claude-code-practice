"use client";

import { useActionState } from "react";
import { requestReset } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState(requestReset, { sent: false });
  if (state.sent) {
    return (
      <Alert tone="success" title="Check your email">
        If that address belongs to a VETLIFE CRM account, a reset link is on its way.
      </Alert>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
