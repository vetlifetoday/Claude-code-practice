import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "../../contact-form";

export const metadata: Metadata = { title: "Edit contact" };

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]/edit">) {
  const { id } = await params;
  await requireRole("admin", "staff");
  const supabase = await createClient();
  const [{ data: c }, categories] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "*, contact_categories(category_id, subcategory_id), veteran:veteran_id(display_name), organization:organization_id(display_name)",
      )
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    getCategories(),
  ]);
  if (!c) notFound();

  const s = (v: string | null) => v ?? "";
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit ${c.display_name}`} back={{ href: `/contacts/${id}`, label: c.display_name ?? "Contact" }} />
      <ContactForm
        contactId={id}
        categories={categories}
        initialLabels={{
          veteran: c.veteran?.display_name ?? null,
          organization: c.organization?.display_name ?? null,
        }}
        initial={{
          kind: c.kind,
          first_name: s(c.first_name),
          last_name: s(c.last_name),
          company: s(c.company),
          title: s(c.title),
          email: s(c.email),
          phone: s(c.phone),
          address: s(c.address),
          city: s(c.city),
          state: s(c.state),
          zip: s(c.zip),
          years_of_service: c.years_of_service == null ? "" : String(c.years_of_service),
          notes: s(c.notes),
          veteran_id: c.veteran_id,
          organization_id: c.organization_id,
          tags: c.contact_categories.map((t) => ({ category_id: t.category_id, subcategory_id: t.subcategory_id })),
        }}
      />
    </div>
  );
}
