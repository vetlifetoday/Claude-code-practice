"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { SORTS, filtersToQuery, type ContactFilters, type SortKey } from "@/lib/contact-filters";
import type { CategoryWithSubs } from "@/lib/types";
import { US_STATES } from "@/lib/utils";

const STATE_NAMES = new Map(US_STATES);

export function FilterBar({
  filters,
  categories,
  locations,
}: {
  filters: ContactFilters;
  categories: CategoryWithSubs[];
  locations: { state: string; city: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);

  const go = (patch: Partial<ContactFilters>) => {
    const next = { ...filters, q, ...patch, page: 1 };
    startTransition(() => router.push(`/contacts${filtersToQuery(next)}`));
  };

  const category = categories.find((c) => c.id === filters.category);
  const states = [...new Set(locations.map((l) => l.state))];
  const cities = [
    ...new Set(locations.filter((l) => l.city && (!filters.state || l.state === filters.state)).map((l) => l.city!)),
  ].sort();
  const anyFilter = filters.q || filters.category || filters.sub || filters.state || filters.city;

  return (
    <div className="mb-4 space-y-3">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, company, or phone"
            className="pl-9"
            aria-label="Search contacts"
          />
        </div>
        <Button type="submit" variant="secondary">
          {pending ? <Loader2 className="size-4 animate-spin" aria-label="Loading" /> : "Search"}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <Select
          aria-label="Category"
          value={filters.category}
          onChange={(e) => go({ category: e.target.value, sub: "" })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Subcategory"
          value={filters.sub}
          disabled={!category || category.subcategories.length === 0}
          onChange={(e) => go({ sub: e.target.value })}
        >
          <option value="">{category?.subcategories.length ? `All ${category.name}` : "Subcategory"}</option>
          {category?.subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="State" value={filters.state} onChange={(e) => go({ state: e.target.value, city: "" })}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {STATE_NAMES.get(s) ?? s}
            </option>
          ))}
        </Select>
        <Select aria-label="City" value={filters.city} onChange={(e) => go({ city: e.target.value })}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort by"
          className="lg:col-span-1"
          value={`${filters.sort}:${filters.dir}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
            go({ sort, dir });
          }}
        >
          {Object.entries(SORTS).flatMap(([key, s]) => [
            <option key={`${key}:asc`} value={`${key}:asc`}>
              Sort: {s.label} {key === "created" ? "(oldest)" : "(A–Z)"}
            </option>,
            <option key={`${key}:desc`} value={`${key}:desc`}>
              Sort: {s.label} {key === "created" ? "(newest)" : "(Z–A)"}
            </option>,
          ])}
        </Select>
        {anyFilter ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQ("");
              startTransition(() =>
                router.push(`/contacts${filtersToQuery({ sort: filters.sort, dir: filters.dir, size: filters.size })}`),
              );
            }}
          >
            <X className="size-4" aria-hidden /> Clear
          </Button>
        ) : (
          <span className="hidden md:block" />
        )}
      </div>
    </div>
  );
}
