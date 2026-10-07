import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { TAG_SELECT, type TagRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Alert, Card, EmptyState, Input, LinkButton, PageHeader, buttonClasses } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TagList } from "@/components/tag-list";

export const metadata: Metadata = { title: "Contacts" };

const PAGE_SIZE = 25;

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const [sp, session] = await Promise.all([searchParams, requireSession()]);
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await supabase
    .rpc("search_contacts", { p_query: q }, { count: "exact" })
    .select(`id, kind, display_name, first_name, last_name, email, phone, company, city, state, ${TAG_SELECT}`)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => `/contacts?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Contacts"
        description={`${total.toLocaleString()} ${total === 1 ? "contact" : "contacts"}`}
        actions={
          session.canEdit && (
            <LinkButton href="/contacts/new">
              <Plus className="size-4" aria-hidden /> New contact
            </LinkButton>
          )
        }
      />

      {sp.archived && <Alert tone="success" className="mb-4">Contact archived.</Alert>}
      {error && <Alert tone="error" className="mb-4">Could not load contacts: {error.message}</Alert>}

      <form className="mb-4 flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search name, email, company, or phone" className="pl-9" aria-label="Search contacts" />
        </div>
        <button className={buttonClasses("secondary")}>Search</button>
      </form>

      <Card className="overflow-hidden">
        {data && data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.map((c) => (
              <li key={c.id}>
                <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-navy-50 sm:px-5">
                  <Avatar name={c.display_name ?? ""} kind={c.kind} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-900">{c.display_name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {[c.kind === "person" ? c.company : null, c.email, [c.city, c.state].filter(Boolean).join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="hidden max-w-xs md:block">
                    <TagList tags={c.contact_categories as TagRow[]} max={3} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={q ? "No contacts match your search." : "No contacts yet."} />
        )}
      </Card>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-slate-600">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link className={buttonClasses("secondary", "sm")} href={pageHref(page - 1)}>Previous</Link>}
            {page < pages && <Link className={buttonClasses("secondary", "sm")} href={pageHref(page + 1)}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
