import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { restoreContact } from "../../contacts/actions";
import { restoreDocument, restoreInteraction } from "../../contacts/[id]/actions";
import { INTERACTION_LABELS, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: contacts }, { data: notes }, { data: docs }] = await Promise.all([
    supabase
      .rpc("search_contacts", { p_archived: true })
      .select("id, display_name, email, city, state, archived_at, archiver:profiles!contacts_archived_by_fkey(full_name, email)")
      .order("archived_at", { ascending: false })
      .limit(500),
    supabase
      .from("interactions")
      .select(
        "id, type, occurred_on, summary, archived_at, contact:contacts!interactions_contact_id_fkey(id, display_name), archiver:profiles!interactions_archived_by_fkey(full_name, email)",
      )
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(200),
    supabase
      .from("contact_documents")
      .select(
        "id, file_name, archived_at, contact:contacts!contact_documents_contact_id_fkey(id, display_name), archiver:profiles!contact_documents_archived_by_fkey(full_name, email)",
      )
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(200),
  ]);
  const who = (p: { full_name: string | null; email: string } | null) => (p ? ` by ${p.full_name || p.email}` : "");

  return (
    <>
      <PageHeader title="Archive" description="Archived records are hidden from staff and viewers. Restore them here." />
      <Card>
        <CardHeader title="Archived contacts" />
        {contacts && contacts.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-navy-700 hover:underline">
                    {c.display_name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    Archived {formatDateTime(c.archived_at)}
                    {c.archiver && ` by ${c.archiver.full_name || c.archiver.email}`}
                  </p>
                </div>
                <ConfirmActionButton size="sm" action={restoreContact.bind(null, c.id)} confirmText={`Restore ${c.display_name}?`}>
                  Restore
                </ConfirmActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No archived contacts." />
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Deleted timeline entries" />
        {notes && notes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{INTERACTION_LABELS[n.type]}</span>
                    <span className="text-slate-500"> · {formatDate(n.occurred_on)} · </span>
                    {n.contact && (
                      <Link href={`/contacts/${n.contact.id}`} className="text-navy-700 hover:underline">
                        {n.contact.display_name}
                      </Link>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{n.summary}</p>
                  <p className="text-xs text-slate-500">
                    Deleted {formatDateTime(n.archived_at)}
                    {who(n.archiver)}
                  </p>
                </div>
                <ConfirmActionButton size="sm" action={restoreInteraction.bind(null, n.id)} confirmText="Restore this timeline entry?">
                  Restore
                </ConfirmActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No deleted timeline entries." />
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Removed documents" />
        {docs && docs.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {d.contact && (
                      <Link href={`/contacts/${d.contact.id}`} className="text-navy-700 hover:underline">
                        {d.contact.display_name}
                      </Link>
                    )}{" "}
                    · Removed {formatDateTime(d.archived_at)}
                    {who(d.archiver)}
                  </p>
                </div>
                <ConfirmActionButton size="sm" action={restoreDocument.bind(null, d.id)} confirmText={`Restore ${d.file_name}?`}>
                  Restore
                </ConfirmActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No removed documents." />
        )}
      </Card>
    </>
  );
}
