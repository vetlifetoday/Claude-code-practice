import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { CategoryEditor } from "./category-editor";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [categories, { data: counts }] = await Promise.all([
    getCategories(),
    supabase.rpc("category_counts"),
  ]);
  const usage: Record<string, number> = {};
  for (const row of counts ?? []) {
    usage[row.subcategory_id ?? row.category_id] = Number(row.contact_count);
  }
  return (
    <>
      <PageHeader
        title="Categories"
        description="Manage the categories and subcategories used to tag contacts (for example, add next year's events)."
      />
      <CategoryEditor categories={categories} usage={usage} />
    </>
  );
}
