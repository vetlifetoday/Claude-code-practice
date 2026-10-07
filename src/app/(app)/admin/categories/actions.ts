"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const name = z.string().trim().min(1, "Enter a name.").max(80, "Keep names under 80 characters.");
const sortOrder = z.coerce.number().int().min(0).max(100000);

async function guard(): Promise<ActionResult | null> {
  const s = await checkRole("admin");
  return "error" in s ? { ok: false, error: s.error } : null;
}

function done(message: string): ActionResult {
  revalidatePath("/admin/categories");
  revalidatePath("/contacts", "layout");
  return { ok: true, message };
}

export async function addCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: last } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { error } = await supabase
    .from("categories")
    .insert({ name: parsed.data, sort_order: (last?.[0]?.sort_order ?? 0) + 10 });
  if (error) return { ok: false, error: error.code === "23505" ? "A category with that name already exists." : friendlyError(error) };
  return done(`Added “${parsed.data}”.`);
}

export async function addSubcategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = name.safeParse(formData.get("name"));
  const categoryId = z.uuid().safeParse(formData.get("category_id"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!categoryId.success) return { ok: false, error: "Unknown category." };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("subcategories")
    .select("sort_order")
    .eq("category_id", categoryId.data)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await supabase
    .from("subcategories")
    .insert({ category_id: categoryId.data, name: parsed.data, sort_order: (last?.[0]?.sort_order ?? 0) + 10 });
  if (error) return { ok: false, error: error.code === "23505" ? "That subcategory already exists." : friendlyError(error) };
  return done(`Added “${parsed.data}”.`);
}

export async function updateItem(
  table: "categories" | "subcategories",
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = z
    .object({ name, sort_order: sortOrder, is_active: z.boolean() })
    .safeParse({
      name: formData.get("name"),
      sort_order: formData.get("sort_order"),
      is_active: formData.get("is_active") === "on",
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } =
    table === "categories"
      ? await supabase.from("categories").update(parsed.data).eq("id", id)
      : await supabase.from("subcategories").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "That name is already used." : friendlyError(error) };
  return done("Saved.");
}
