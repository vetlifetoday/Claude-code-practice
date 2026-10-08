"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_MAX_BYTES, docContentType, docPrefix, photoPrefix } from "@/lib/files";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const interactionSchema = z.object({
  type: z.enum(["note", "call", "email", "meeting", "event", "other"]),
  occurred_on: z.iso.date("Choose a valid date."),
  summary: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(10000, "Keep entries under 10,000 characters."),
});

function parseInteraction(formData: FormData) {
  return interactionSchema.safeParse({
    type: formData.get("type"),
    occurred_on: formData.get("occurred_on"),
    summary: formData.get("summary"),
  });
}

const refresh = (contactId: string) => revalidatePath(`/contacts/${contactId}`);

async function editor() {
  const s = await checkRole("admin", "staff");
  return "error" in s ? s.error : null;
}

export async function addInteraction(contactId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await editor();
  if (denied) return { ok: false, error: denied };
  const parsed = parseInteraction(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("interactions").insert({ ...parsed.data, contact_id: contactId });
  if (error) return { ok: false, error: friendlyError(error) };
  refresh(contactId);
  return { ok: true, message: "Added to timeline." };
}

export async function updateInteraction(
  id: string,
  contactId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await editor();
  if (denied) return { ok: false, error: denied };
  const parsed = parseInteraction(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("interactions").update(parsed.data).eq("id", id).select("id");
  if (error) return { ok: false, error: friendlyError(error) };
  if (!data?.length) return { ok: false, error: "That entry no longer exists." };
  refresh(contactId);
  return { ok: true, message: "Saved." };
}

async function setArchived(entity: "interaction" | "document", id: string, archive: boolean) {
  const s = archive ? await checkRole("admin", "staff") : await checkRole("admin");
  if ("error" in s) return { error: s.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_archived", { p_entity: entity, p_id: id, p_archive: archive });
  return error ? { error: friendlyError(error) } : {};
}

export async function archiveInteraction(id: string, contactId: string) {
  const res = await setArchived("interaction", id, true);
  if (!res.error) refresh(contactId);
  return res;
}

export async function archiveDocument(id: string, contactId: string) {
  const res = await setArchived("document", id, true);
  if (!res.error) refresh(contactId);
  return res;
}

export async function restoreInteraction(id: string) {
  const res = await setArchived("interaction", id, false);
  if (!res.error) revalidatePath("/admin/archive");
  return res;
}

export async function restoreDocument(id: string) {
  const res = await setArchived("document", id, false);
  if (!res.error) revalidatePath("/admin/archive");
  return res;
}

/** Saves the storage path of a photo/logo the browser just uploaded (or clears it). */
export async function setPhoto(contactId: string, path: string | null): Promise<{ error?: string }> {
  const denied = await editor();
  if (denied) return { error: denied };
  if (path !== null && (!path.startsWith(photoPrefix(contactId)) || path.includes(".."))) {
    return { error: "Invalid file location." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("contacts").update({ photo_path: path }).eq("id", contactId).select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: "This contact can't be changed." };
  refresh(contactId);
  revalidatePath("/contacts");
  return {};
}

const uploadedDoc = z.object({
  path: z.string().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().min(1).max(DOC_MAX_BYTES),
});

/** Records documents the browser just uploaded to storage. */
export async function registerDocuments(
  contactId: string,
  files: z.input<typeof uploadedDoc>[],
): Promise<{ error?: string }> {
  const denied = await editor();
  if (denied) return { error: denied };
  const parsed = z.array(uploadedDoc).min(1).max(20).safeParse(files);
  if (!parsed.success) return { error: "Invalid upload." };

  const rows = [];
  for (const f of parsed.data) {
    if (!f.path.startsWith(docPrefix(contactId)) || f.path.includes("..")) return { error: "Invalid file location." };
    const mime = docContentType(f.name);
    if (!mime) return { error: `${f.name}: only PDF, image, and Word files are allowed.` };
    rows.push({ contact_id: contactId, storage_path: f.path, file_name: f.name, mime_type: mime, size_bytes: f.size });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_documents").insert(rows);
  if (error) return { error: friendlyError(error) };
  refresh(contactId);
  return {};
}
