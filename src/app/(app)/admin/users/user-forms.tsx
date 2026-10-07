"use client";

import { useActionState } from "react";
import { inviteUser, updateUser } from "./actions";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { AppRole } from "@/lib/types";

export function InviteForm() {
  const [state, action] = useActionState(inviteUser, null);
  return (
    <form action={action} className="space-y-4">
      {state && (state.ok ? <Alert tone="success">{state.message}</Alert> : <Alert tone="error">{state.error}</Alert>)}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <Field label="Email" htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Name" htmlFor="invite-name">
          <Input id="invite-name" name="full_name" autoComplete="off" />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="staff">
            <option value="viewer">Viewer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
      </div>
    </form>
  );
}

export function UserRowForm({
  userId,
  role,
  isActive,
  isSelf,
}: {
  userId: string;
  role: AppRole;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateUser.bind(null, userId), null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Select name="role" defaultValue={role} aria-label="Role" className="w-28" disabled={isSelf}>
        <option value="viewer">Viewer</option>
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </Select>
      {isSelf && <input type="hidden" name="role" value={role} />}
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={isActive} disabled={isSelf} className="size-4 accent-navy-700" />
        Active
      </label>
      {isSelf && isActive && <input type="hidden" name="is_active" value="on" />}
      {!isSelf && (
        <SubmitButton size="sm" variant="secondary" pendingText="Saving…">
          Save
        </SubmitButton>
      )}
      {state && <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</span>}
    </form>
  );
}
