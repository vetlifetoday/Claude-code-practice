import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ContactKind = Database["public"]["Enums"]["contact_kind"];
export type InteractionType = Database["public"]["Enums"]["interaction_type"];

export type Profile = Tables["profiles"]["Row"];
export type Category = Tables["categories"]["Row"];
export type Subcategory = Tables["subcategories"]["Row"];
export type Contact = Tables["contacts"]["Row"];
export type ContactInsert = Tables["contacts"]["Insert"];
export type ContactCategory = Tables["contact_categories"]["Row"];
export type Interaction = Tables["interactions"]["Row"];
export type ContactDocument = Tables["contact_documents"]["Row"];
export type AuditLogEntry = Tables["audit_log"]["Row"];

export type CategoryWithSubs = Category & { subcategories: Subcategory[] };

export type TagRef = { category_id: string; subcategory_id: string | null };

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
