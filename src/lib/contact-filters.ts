/** Contact list filters, read from / written to the URL so views can be bookmarked and exported. */

export const SORTS = {
  name: { label: "Name", column: "sort_name" },
  company: { label: "Company", column: "company" },
  email: { label: "Email", column: "email" },
  city: { label: "City", column: "city" },
  state: { label: "State", column: "state" },
  created: { label: "Date added", column: "created_at" },
} as const;

export type SortKey = keyof typeof SORTS;
export const PAGE_SIZES = [25, 50, 100] as const;

export type ContactFilters = {
  q: string;
  category: string;
  sub: string;
  state: string;
  city: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  size: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Params): ContactFilters {
  const sort = one(sp.sort) as SortKey;
  const size = Number(one(sp.size));
  return {
    q: one(sp.q).slice(0, 200),
    category: UUID.test(one(sp.category)) ? one(sp.category) : "",
    sub: UUID.test(one(sp.sub)) ? one(sp.sub) : "",
    state: /^[A-Za-z]{2}$/.test(one(sp.state)) ? one(sp.state).toUpperCase() : "",
    city: one(sp.city).slice(0, 80),
    sort: sort in SORTS ? sort : "name",
    dir: one(sp.dir) === "desc" ? "desc" : "asc",
    page: Math.max(1, Math.floor(Number(one(sp.page))) || 1),
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 25,
  };
}

/** Builds a query string, leaving out defaults so URLs stay short. */
export function filtersToQuery(f: Partial<ContactFilters>) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  if (f.sub) p.set("sub", f.sub);
  if (f.state) p.set("state", f.state);
  if (f.city) p.set("city", f.city);
  if (f.sort && f.sort !== "name") p.set("sort", f.sort);
  if (f.dir === "desc") p.set("dir", "desc");
  if (f.size && f.size !== 25) p.set("size", String(f.size));
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: ContactFilters) {
  return !!(f.q || f.category || f.sub || f.state || f.city);
}

/** Arguments for the search_contacts database function. */
export function rpcArgs(f: ContactFilters) {
  return {
    p_query: f.q || undefined,
    p_category_id: f.category || undefined,
    p_subcategory_id: f.sub || undefined,
    p_state: f.state || undefined,
    p_city: f.city || undefined,
  };
}

/** Columns that must be selected for the given sort to work on an RPC result. */
export const SORT_COLUMNS = "sort_name, company, email, city, state, created_at";
