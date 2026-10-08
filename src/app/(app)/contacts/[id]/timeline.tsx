"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarDays, Mail, MessageSquare, MoreHorizontal, Pencil, Phone, Trash2, Users } from "lucide-react";
import { addInteraction, archiveInteraction, updateInteraction } from "./actions";
import { Button, Field, Select, Textarea, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { INTERACTION_LABELS, cn, formatDate, formatDateTime } from "@/lib/utils";
import type { ActionResult, InteractionType } from "@/lib/types";

export type TimelineEntry = {
  id: string;
  type: InteractionType;
  occurred_on: string;
  summary: string;
  created_at: string;
  updated_at: string;
  author: string | null;
  editor: string | null;
};

const ICONS: Record<InteractionType, typeof Phone> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  event: CalendarDays,
  other: MoreHorizontal,
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EntryFields({ entry, autoFocus }: { entry?: TimelineEntry; autoFocus?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor={`type-${entry?.id ?? "new"}`}>
          <Select id={`type-${entry?.id ?? "new"}`} name="type" defaultValue={entry?.type ?? "note"}>
            {Object.entries(INTERACTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor={`date-${entry?.id ?? "new"}`}>
          <Input
            id={`date-${entry?.id ?? "new"}`}
            name="occurred_on"
            type="date"
            required
            defaultValue={entry?.occurred_on ?? today()}
          />
        </Field>
      </div>
      <Field label="What happened?" htmlFor={`summary-${entry?.id ?? "new"}`}>
        <Textarea
          id={`summary-${entry?.id ?? "new"}`}
          name="summary"
          rows={3}
          required
          maxLength={10000}
          defaultValue={entry?.summary}
          autoFocus={autoFocus}
        />
      </Field>
    </>
  );
}

function AddEntry({ contactId }: { contactId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(addInteraction.bind(null, contactId), null);
  // React resets the form automatically after the action runs.
  return (
    <form action={action} className="space-y-3 border-b border-slate-200 p-4 sm:p-5">
      <EntryFields />
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingText="Adding…">
          Add to timeline
        </SubmitButton>
        {state && !state.ok && <span className="text-sm text-red-700">{state.error}</span>}
        {state?.ok && <span className="text-sm text-emerald-700">{state.message}</span>}
      </div>
      <p className="text-xs text-slate-500">Do not record health, medical, or diagnosis information.</p>
    </form>
  );
}

function Entry({ entry, contactId, canEdit }: { entry: TimelineEntry; contactId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const res = await updateInteraction(entry.id, contactId, prev, fd);
      if (res.ok) setEditing(false);
      return res;
    },
    null,
  );
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const Icon = ICONS[entry.type];
  const edited = new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 60_000;

  return (
    <li className={cn("relative flex gap-3 px-4 py-4 sm:px-5", removing && "opacity-50")}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-700">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm">
            <span className="font-semibold text-navy-900">{INTERACTION_LABELS[entry.type]}</span>
            <span className="text-slate-500"> · {formatDate(entry.occurred_on, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
          </p>
          {canEdit && !editing && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                aria-label="Edit entry"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirm("Delete this timeline entry? An administrator can restore it from the Archive.")) return;
                  setRemoveError(null);
                  startRemove(async () => {
                    const res = await archiveInteraction(entry.id, contactId);
                    if (res.error) setRemoveError(res.error);
                  });
                }}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                aria-label="Delete entry"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <form action={action} className="mt-2 space-y-3">
            <EntryFields entry={entry} autoFocus />
            <div className="flex items-center gap-2">
              <SubmitButton size="sm" pendingText="Saving…">
                Save
              </SubmitButton>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              {state && !state.ok && <span className="text-sm text-red-700">{state.error}</span>}
            </div>
          </form>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{entry.summary}</p>
            <p className="mt-1 text-xs text-slate-500">
              {entry.author ? `Added by ${entry.author}` : "Added"} {formatDateTime(entry.created_at)}
              {edited && ` · edited${entry.editor ? ` by ${entry.editor}` : ""} ${formatDateTime(entry.updated_at)}`}
            </p>
            {removeError && <p className="mt-1 text-xs text-red-700">{removeError}</p>}
          </>
        )}
      </div>
    </li>
  );
}

export function Timeline({
  contactId,
  entries,
  canEdit,
}: {
  contactId: string;
  entries: TimelineEntry[];
  canEdit: boolean;
}) {
  return (
    <>
      {canEdit && <AddEntry contactId={contactId} />}
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">No timeline entries yet.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {entries.map((e) => (
            <Entry key={`${e.id}-${e.updated_at}`} entry={e} contactId={contactId} canEdit={canEdit} />
          ))}
        </ol>
      )}
    </>
  );
}
