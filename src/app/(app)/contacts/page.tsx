import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { TAG_SELECT, getCategories, type TagRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/signed-urls";
import {
  PAGE_SIZES,
  SORTS,
  SORT_COLUMNS,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  rpcArgs,
  type ContactFilters,
  type SortKey,
} from "@/lib/contact-filters";
import { Alert, Card, EmptyState, LinkButton, PageHeader, buttonClasses } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TagList } from "@/components/tag-list";
import { FilterBar } from "./filter-bar";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const [sp, session] = await Promise.all([searchParams, requireSession()]);
  const f = parseFilters(sp);
  const supabase = await createClient();

  const from = (f.page - 1) * f.size;
  const sortColumn = SORTS[f.sort].column;
  let query = supabase
    .rpc("search_contacts", rpcArgs(f), { count: "exact" })
    .select(`id, kind, display_name, phone, photo_path, ${SORT_COLUMNS}, ${TAG_SELECT}`)
    .order(sortColumn, { ascending: f.dir === "asc", nullsFirst: false });
  if (f.sort !== "name") query = query.order("sort_name", { ascending: true });
  const [{ data, count, error }, categories, { data: locations }] = await Promise.all([
    query.order("id").range(from, from + f.size - 1),
    getCategories(),
    supabase.rpc("contact_locations"),
  ]);

  const rows = data ?? [];
  const photos = await signPhotoUrls(rows.map((r) => r.photo_path));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / f.size));
  const filtered = hasActiveFilters(f);
  const href = (patch: Partial<ContactFilters>) => `/contacts${filtersToQuery({ ...f, ...patch })}`;

  const sortHeader = (k: SortKey, className?: string) => {
    const active = f.sort === k;
    const nextDir = active && f.dir === "asc" ? "desc" : "asc";
    const Icon = !active ? ArrowUpDown : f.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th key={k} scope="col" className={cn("px-3 py-2.5 text-left font-medium", className)} aria-sort={active ? (f.dir === "asc" ? "ascending" : "descending") : "none"}>
        <Link href={href({ sort: k, dir: nextDir, page: 1 })} className="inline-flex items-center gap-1 hover:text-navy-900">
          {SORTS[k].label}
          <Icon className={cn("size-3.5", active ? "text-navy-700" : "text-slate-400")} aria-hidden />
        </Link>
      </th>
    );
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description={
          filtered
            ? `${total.toLocaleString()} matching ${total === 1 ? "contact" : "contacts"}`
            : `${total.toLocaleString()} ${total === 1 ? "contact" : "contacts"}`
        }
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

      <FilterBar
        key={filtersToQuery(f)}
        filters={f}
        categories={categories}
        locations={(locations ?? []).filter((l) => !!l.state)}
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title={filtered ? "No contacts match these filters." : "No contacts yet."}>
            {filtered && (
              <Link href="/contacts" className="text-navy-600 hover:underline">
                Clear filters
              </Link>
            )}
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {sortHeader("name", "pl-5")}
                    {sortHeader("company")}
                    {sortHeader("email")}
                    <th scope="col" className="hidden px-3 py-2.5 text-left font-medium 2xl:table-cell">Phone</th>
                    {sortHeader("city")}
                    {sortHeader("state")}
                    <th scope="col" className="px-3 py-2.5 text-left font-medium">Categories</th>
                    {sortHeader("created", "hidden pr-5 2xl:table-cell")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-navy-50">
                      <td className="py-2.5 pl-5 pr-3">
                        <Link href={`/contacts/${c.id}`} className="flex items-center gap-2.5 font-medium text-navy-800 hover:underline">
                          <Avatar name={c.display_name ?? ""} kind={c.kind} size="sm" src={c.photo_path ? photos.get(c.photo_path) : null} />
                          <span className="max-w-56 truncate">{c.display_name}</span>
                        </Link>
                      </td>
                      <td className="max-w-40 truncate px-3 py-2.5 text-slate-700">{c.kind === "person" ? c.company : ""}</td>
                      <td className="max-w-52 truncate px-3 py-2.5 text-slate-700">{c.email}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 2xl:table-cell">{c.phone}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{c.city}</td>
                      <td className="px-3 py-2.5 text-slate-700">{c.state}</td>
                      <td className="px-3 py-2.5">
                        <TagList tags={c.contact_categories as TagRow[]} max={1} nowrap />
                      </td>
                      <td className="hidden whitespace-nowrap py-2.5 pl-3 pr-5 text-slate-500 2xl:table-cell">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link href={`/contacts/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-navy-50">
                    <Avatar name={c.display_name ?? ""} kind={c.kind} size="sm" src={c.photo_path ? photos.get(c.photo_path) : null} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-navy-900">{c.display_name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {[c.kind === "person" ? c.company : null, c.email, [c.city, c.state].filter(Boolean).join(", ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-1">
                        <TagList tags={c.contact_categories as TagRow[]} max={3} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {total > 0 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pagination">
          <span className="text-slate-600">
            Showing {(from + 1).toLocaleString()}–{Math.min(from + f.size, total).toLocaleString()} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Per page:</span>
            {PAGE_SIZES.map((s) => (
              <Link
                key={s}
                href={href({ size: s, page: 1 })}
                aria-current={f.size === s ? "true" : undefined}
                className={cn("rounded px-2 py-1", f.size === s ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-100")}
              >
                {s}
              </Link>
            ))}
            {pages > 1 && (
              <>
                <span className="mx-1 text-slate-300">|</span>
                {f.page > 1 ? (
                  <Link className={buttonClasses("secondary", "sm")} href={href({ page: f.page - 1 })}>
                    Previous
                  </Link>
                ) : null}
                <span className="text-slate-600">
                  Page {f.page} of {pages}
                </span>
                {f.page < pages ? (
                  <Link className={buttonClasses("secondary", "sm")} href={href({ page: f.page + 1 })}>
                    Next
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
