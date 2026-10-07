import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { restoreContact } from "../../contacts/actions";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .rpc("search_contacts", { p_archived: true })
    .select("id, display_name, email, city, state, archived_at, archiver:profiles!contacts_archived_by_fkey(full_name, email)")
    .order("archived_at", { ascending: false })
    .limit(500);

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
          <EmptyState title="Nothing is archived." />
        )}
      </Card>
    </>
  );
}
