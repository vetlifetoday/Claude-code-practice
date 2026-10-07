"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRole, requireSession } from "@/lib/auth";
import { contactSchema, type ContactInput } from "@/lib/contact-schema";
import { friendlyError } from "@/lib/utils";

export type Duplicate = {
  id: string;
  display_name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  reason: string;
  is_archived: boolean;
};

export type SaveContactState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  duplicates?: Duplicate[];
};

export async function findDuplicates(input: {
  email?: string;
  first_name?: string;
  last_name?: string;
  zip?: string;
  excludeId?: string | null;
}): Promise<Duplicate[]> {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_possible_duplicates", {
    p_email: input.email?.trim() ?? "",
    p_first_name: input.first_name?.trim() ?? "",
    p_last_name: input.last_name?.trim() ?? "",
    p_zip: input.zip?.trim() ?? "",
    p_exclude_id: input.excludeId || undefined,
  });
  return (data ?? []) as Duplicate[];
}

export async function saveContact(
  _prev: SaveContactState,
  payload: { id: string | null; values: ContactInput; confirmDuplicates: boolean },
): Promise<SaveContactState> {
  const session = await checkRole("admin", "staff");
  if ("error" in session) return { formError: session.error };

  const parsed = contactSchema.safeParse(payload.values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, formError: "Please fix the highlighted fields." };
  }
  const { tags, ...values } = parsed.data;
  const id = payload.id;

  if (id && (values.veteran_id === id || values.organization_id === id)) {
    return { formError: "A contact can't be linked to itself." };
  }

  if (!payload.confirmDuplicates) {
    const duplicates = await findDuplicates({
      email: values.email ?? undefined,
      first_name: values.first_name ?? undefined,
      last_name: values.last_name ?? undefined,
      zip: values.zip ?? undefined,
      excludeId: id,
    });
    if (duplicates.length > 0) return { duplicates };
  }

  const supabase = await createClient();
  let contactId = id;
  if (id) {
    const { data, error } = await supabase.from("contacts").update(values).eq("id", id).select("id");
    if (error) return { formError: friendlyError(error) };
    if (!data?.length) return { formError: "This contact no longer exists or was archived." };
  } else {
    const { data, error } = await supabase.from("contacts").insert(values).select("id").single();
    if (error) return { formError: friendlyError(error) };
    contactId = data.id;
  }

  // Sync category tags: remove the ones that were unchecked, add the new ones.
  const key = (t: { category_id: string; subcategory_id: string | null }) => `${t.category_id}:${t.subcategory_id ?? ""}`;
  const wanted = new Map(tags.map((t) => [key(t), t]));
  const { data: existing, error: tagErr } = await supabase
    .from("contact_categories")
    .select("id, category_id, subcategory_id")
    .eq("contact_id", contactId!);
  if (tagErr) return { formError: friendlyError(tagErr) };

  const toRemove = (existing ?? []).filter((t) => !wanted.has(key(t))).map((t) => t.id);
  const have = new Set((existing ?? []).map(key));
  const toAdd = [...wanted.values()].filter((t) => !have.has(key(t))).map((t) => ({ ...t, contact_id: contactId! }));

  if (toRemove.length) {
    const { error } = await supabase.from("contact_categories").delete().in("id", toRemove);
    if (error) return { formError: friendlyError(error) };
  }
  if (toAdd.length) {
    const { error } = await supabase.from("contact_categories").insert(toAdd);
    if (error) return { formError: friendlyError(error) };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}?saved=${id ? "updated" : "created"}`);
}

/** Search candidates for the "linked veteran" / "organization" pickers. */
export async function searchLinkCandidates(query: string, type: "veteran" | "organization") {
  await requireSession();
  const supabase = await createClient();
  let categoryId: string | undefined;
  if (type === "veteran") {
    const { data } = await supabase.from("categories").select("id").eq("system_key", "veteran").maybeSingle();
    categoryId = data?.id;
  }
  let q = supabase
    .rpc("search_contacts", { p_query: query, p_category_id: categoryId })
    .select("id, kind, display_name, city, state, company")
    .order("display_name")
    .limit(8);
  if (type === "organization") q = q.eq("kind", "organization");
  const { data } = await q;
  return (data ?? []) as { id: string; display_name: string; city: string | null; state: string | null; company: string | null }[];
}

export async function archiveContact(id: string): Promise<{ error?: string }> {
  const session = await checkRole("admin");
  if ("error" in session) return session;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_archived", { p_entity: "contact", p_id: id, p_archive: true });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/contacts");
  redirect("/contacts?archived=1");
}

export async function restoreContact(id: string): Promise<{ error?: string }> {
  const session = await checkRole("admin");
  if ("error" in session) return session;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_archived", { p_entity: "contact", p_id: id, p_archive: false });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/contacts");
  revalidatePath("/admin/archive");
  revalidatePath(`/contacts/${id}`);
  return {};
}
