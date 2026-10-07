import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ContactForm, EMPTY_CONTACT } from "../contact-form";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage() {
  await requireRole("admin", "staff");
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New contact" back={{ href: "/contacts", label: "Contacts" }} />
      <ContactForm
        contactId={null}
        initial={EMPTY_CONTACT}
        initialLabels={{ veteran: null, organization: null }}
        categories={categories}
      />
    </div>
  );
}
