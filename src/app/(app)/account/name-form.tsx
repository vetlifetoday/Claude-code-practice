"use client";

import { useActionState } from "react";
import { updateName, type FormState } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateName, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Name" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" defaultValue={defaultName} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Saving…">Save name</SubmitButton>
    </form>
  );
}
