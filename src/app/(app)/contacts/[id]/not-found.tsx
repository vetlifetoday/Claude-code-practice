import { LinkButton } from "@/components/ui";

export default function ContactNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Contact not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        It may have been archived, or the link is wrong. Archived contacts are only visible to administrators.
      </p>
      <LinkButton href="/contacts" className="mt-6">
        Back to contacts
      </LinkButton>
    </div>
  );
}
