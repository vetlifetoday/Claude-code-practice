import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CategoryWithSubs } from "@/lib/types";

/** All categories with their subcategories, sorted. Includes inactive ones. */
export const getCategories = cache(async (): Promise<CategoryWithSubs[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*, subcategories(*)")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    subcategories: [...c.subcategories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));
});

/** Select string for a contact's category tags with names. */
export const TAG_SELECT =
  "contact_categories(id, category_id, subcategory_id, categories(name, sort_order), subcategories(name, sort_order))" as const;

export type TagRow = {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  categories: { name: string; sort_order: number } | null;
  subcategories: { name: string; sort_order: number } | null;
};

export function sortTags<T extends TagRow>(tags: T[]): T[] {
  return [...tags].sort(
    (a, b) =>
      (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0) ||
      (a.subcategories?.sort_order ?? 0) - (b.subcategories?.sort_order ?? 0),
  );
}
