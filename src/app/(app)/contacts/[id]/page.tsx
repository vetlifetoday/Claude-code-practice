import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Pencil, Phone } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { TAG_SELECT, type TagRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { signPhotoUrls } from "@/lib/signed-urls";
import { PhotoUploader } from "./photo-uploader";
import { Timeline, type TimelineEntry } from "./timeline";
import { DocumentsPanel, type DocumentRow } from "./documents-panel";
import { TagList } from "@/components/tag-list";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { archiveContact, restoreContact } from "../actions";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact" };

const SAVED: Record<string, string> = { created: "Contact created.", updated: "Changes saved." };

export default async function ContactPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  const [{ id }, sp, session] = await Promise.all([params, searchParams, requireSession()]);
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("contacts")
    .select(
      `*, ${TAG_SELECT},
       veteran:veteran_id(id, display_name),
       organization:organization_id(id, display_name),
       creator:profiles!contacts_created_by_fkey(full_name, email),
       editor:profiles!contacts_updated_by_fkey(full_name, email)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const [{ data: family }, { data: members }, { data: interactions }, { data: docs }, photos] = await Promise.all([
    supabase.from("contacts").select(`id, display_name, ${TAG_SELECT}`).eq("veteran_id", id).is("archived_at", null).order("display_name"),
    supabase.from("contacts").select("id, display_name, title").eq("organization_id", id).is("archived_at", null).order("display_name"),
    supabase
      .from("interactions")
      .select(
        "id, type, occurred_on, summary, created_at, updated_at, author:profiles!interactions_created_by_fkey(full_name, email), editor:profiles!interactions_updated_by_fkey(full_name, email)",
      )
      .eq("contact_id", id)
      .is("archived_at", null)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_documents")
      .select("id, file_name, mime_type, size_bytes, created_at, uploader:profiles!contact_documents_created_by_fkey(full_name, email)")
      .eq("contact_id", id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    signPhotoUrls([c.photo_path]),
  ]);

  const personName = (p: { full_name: string | null; email: string } | null) => (p ? p.full_name || p.email : null);
  const timeline: TimelineEntry[] = (interactions ?? []).map((i) => ({
    id: i.id,
    type: i.type,
    occurred_on: i.occurred_on,
    summary: i.summary,
    created_at: i.created_at,
    updated_at: i.updated_at,
    author: personName(i.author),
    editor: personName(i.editor),
  }));
  const documents: DocumentRow[] = (docs ?? []).map((d) => ({
    id: d.id,
    file_name: d.file_name,
    mime_type: d.mime_type,
    size_bytes: d.size_bytes,
    created_at: d.created_at,
    uploader: personName(d.uploader),
  }));
  const canEditThis = session.canEdit && !c.archived_at;

  const archived = !!c.archived_at;
  const location = [c.city, [c.state, c.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const saved = typeof sp.saved === "string" ? SAVED[sp.saved] : undefined;

  return (
    <>
      <PageHeader
        back={{ href: "/contacts", label: "Contacts" }}
        title={
          <span className="flex items-center gap-4">
            <PhotoUploader
              contactId={id}
              name={c.display_name ?? ""}
              kind={c.kind}
              src={c.photo_path ? (photos.get(c.photo_path) ?? null) : null}
              hasPhoto={!!c.photo_path}
              canEdit={canEditThis}
            />
            <span className="min-w-0">
              <span className="block truncate">{c.display_name}</span>
              {c.kind === "person" && (c.title || c.company) && (
                <span className="block text-sm font-normal text-slate-600">
                  {[c.title, c.company].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </span>
        }
        actions={
          !archived && (
            <>
              {session.canEdit && (
                <LinkButton href={`/contacts/${id}/edit`} variant="primary">
                  <Pencil className="size-4" aria-hidden /> Edit
                </LinkButton>
              )}
              {session.isAdmin && (
                <ConfirmActionButton
                  action={archiveContact.bind(null, id)}
                  confirmText={`Archive ${c.display_name}? It will be hidden from everyone except admins, and can be restored from Admin › Archive.`}
                  pendingText="Archiving…"
                >
                  Archive
                </ConfirmActionButton>
              )}
            </>
          )
        }
      />

      {saved && <Alert tone="success" className="mb-4">{saved}</Alert>}
      {archived && (
        <Alert tone="warning" className="mb-4" title="This contact is archived">
          <p>Archived {formatDateTime(c.archived_at)}. Only administrators can see it.</p>
          {session.isAdmin && (
            <div className="mt-2">
              <ConfirmActionButton action={restoreContact.bind(null, id)} confirmText="Restore this contact?" size="sm">
                Restore contact
              </ConfirmActionButton>
            </div>
          )}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
              <Item label="Email">
                {c.email ? (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-navy-700 hover:underline">
                    <Mail className="size-4" aria-hidden /> {c.email}
                  </a>
                ) : null}
              </Item>
              <Item label="Phone">
                {c.phone ? (
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-navy-700 hover:underline">
                    <Phone className="size-4" aria-hidden /> {c.phone}
                  </a>
                ) : null}
              </Item>
              <Item label="Address" className="sm:col-span-2">
                {c.address || location ? (
                  <span className="inline-flex gap-1.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                    <span>
                      {c.address && <span className="block">{c.address}</span>}
                      {location && <span className="block">{location}</span>}
                    </span>
                  </span>
                ) : null}
              </Item>
              <Item label={c.kind === "person" ? "Company / Organization" : "Organization"}>{c.company}</Item>
              <Item label="Title">{c.title}</Item>
              {c.kind === "person" && (
                <Item label="Years of military service">{c.years_of_service != null ? `${c.years_of_service}` : null}</Item>
              )}
              <Item label="Type">{c.kind === "person" ? "Person" : "Business / Organization"}</Item>
              <Item label="Notes" className="sm:col-span-2">
                {c.notes ? <p className="whitespace-pre-wrap">{c.notes}</p> : null}
              </Item>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Timeline" description="Dated notes, calls, meetings, and events." />
            <Timeline contactId={id} entries={timeline} canEdit={canEditThis} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Categories" />
            <div className="p-4 sm:p-5">
              {c.contact_categories.length ? (
                <TagList tags={c.contact_categories as TagRow[]} />
              ) : (
                <p className="text-sm text-slate-500">No categories yet.</p>
              )}
            </div>
          </Card>

          {(c.veteran || c.organization || (family?.length ?? 0) > 0 || (members?.length ?? 0) > 0) && (
            <Card>
              <CardHeader title="Connections" />
              <ul className="divide-y divide-slate-100 text-sm">
                {c.veteran && (
                  <li className="px-4 py-3 sm:px-5">
                    <span className="text-slate-500">Family of veteran </span>
                    <Link href={`/contacts/${c.veteran.id}`} className="font-medium text-navy-700 hover:underline">
                      {c.veteran.display_name}
                    </Link>
                  </li>
                )}
                {c.organization && (
                  <li className="px-4 py-3 sm:px-5">
                    <span className="text-slate-500">Works at </span>
                    <Link href={`/contacts/${c.organization.id}`} className="font-medium text-navy-700 hover:underline">
                      {c.organization.display_name}
                    </Link>
                  </li>
                )}
                {family?.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                    <Link href={`/contacts/${f.id}`} className="font-medium text-navy-700 hover:underline">
                      {f.display_name}
                    </Link>
                    <TagList tags={f.contact_categories as TagRow[]} max={2} />
                  </li>
                ))}
                {members?.map((m) => (
                  <li key={m.id} className="px-4 py-3 sm:px-5">
                    <Link href={`/contacts/${m.id}`} className="font-medium text-navy-700 hover:underline">
                      {m.display_name}
                    </Link>
                    {m.title && <span className="text-slate-500"> · {m.title}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Documents" />
            <DocumentsPanel contactId={id} documents={documents} canEdit={canEditThis} />
          </Card>

          <Card>
            <CardHeader title="Record" />
            <dl className="space-y-3 p-4 text-sm sm:p-5">
              <Item label="Created">
                {formatDate(c.created_at)}
                {c.creator && <span className="text-slate-500"> by {c.creator.full_name || c.creator.email}</span>}
              </Item>
              <Item label="Last updated">
                {formatDateTime(c.updated_at)}
                {c.editor && <span className="text-slate-500"> by {c.editor.full_name || c.editor.email}</span>}
              </Item>
              {archived && (
                <Item label="Status">
                  <Badge tone="amber">Archived</Badge>
                </Item>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">
        {children === null || children === undefined || children === "" ? <span className="text-slate-400">—</span> : children}
      </dd>
    </div>
  );
}
