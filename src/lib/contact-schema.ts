import { z } from "zod";
import { US_STATES } from "@/lib/utils";

const STATE_CODES = new Set(US_STATES.map(([code]) => code));

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((v) => (v === "" ? null : v));

export const tagSchema = z.object({
  category_id: z.uuid(),
  subcategory_id: z.uuid().nullable(),
});

export const contactSchema = z
  .object({
    kind: z.enum(["person", "organization"]),
    first_name: text(80, "First name"),
    last_name: text(80, "Last name"),
    company: text(160, "Company / Organization"),
    title: text(120, "Title"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address, or leave it blank.")
      .transform((v) => (v === "" ? null : v)),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v === "" || v.replace(/\D/g, "").length >= 7, "Enter a valid phone number, or leave it blank.")
      .transform((v) => (v === "" ? null : formatPhone(v))),
    address: text(200, "Address"),
    city: text(80, "City"),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || STATE_CODES.has(v), "Choose a state from the list.")
      .transform((v) => (v === "" ? null : v)),
    zip: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{5}(-\d{4})?$/.test(v), "Use a 5-digit ZIP (or ZIP+4).")
      .transform((v) => (v === "" ? null : v)),
    years_of_service: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) <= 80), "Enter whole years from 0 to 80.")
      .transform((v) => (v === "" ? null : Number(v))),
    notes: text(5000, "Notes"),
    veteran_id: z.uuid().nullable(),
    organization_id: z.uuid().nullable(),
    tags: z.array(tagSchema).max(100),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "person" && !v.first_name && !v.last_name) {
      ctx.addIssue({ code: "custom", path: ["first_name"], message: "Enter a first or last name." });
    }
    if (v.kind === "organization" && !v.company) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "Enter the organization's name." });
    }
  });

export type ContactInput = z.input<typeof contactSchema>;
export type ContactParsed = z.output<typeof contactSchema>;

/** Formats 10-digit US numbers as (555) 555-0100; leaves anything else as typed. */
export function formatPhone(v: string) {
  const digits = v.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length === 10 && /^[\d\s().+-]+$/.test(v)) {
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  return v;
}
