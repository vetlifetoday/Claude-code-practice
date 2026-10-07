"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Building2, User } from "lucide-react";
import { findDuplicates, saveContact, type Duplicate, type SaveContactState } from "./actions";
import type { CategoryWithSubs, TagRef } from "@/lib/types";
import type { ContactInput } from "@/lib/contact-schema";
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";
import { CategoryPicker } from "@/components/category-picker";
import { ContactPicker } from "@/components/contact-picker";
import { DuplicateWarning } from "@/components/duplicate-warning";
import { US_STATES, cn } from "@/lib/utils";

export type ContactFormValues = Omit<ContactInput, "tags"> & { tags: TagRef[] };

export const EMPTY_CONTACT: ContactFormValues = {
  kind: "person",
  first_name: "",
  last_name: "",
  company: "",
  title: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  years_of_service: "",
  notes: "",
  veteran_id: null,
  organization_id: null,
  tags: [],
};

export function ContactForm({
  contactId,
  initial,
  initialLabels,
  categories,
}: {
  contactId: string | null;
  initial: ContactFormValues;
  initialLabels: { veteran: string | null; organization: string | null };
  categories: CategoryWithSubs[];
}) {
  const [values, setValues] = useState<ContactFormValues>(initial);
  const [labels, setLabels] = useState(initialLabels);
  const [liveDups, setLiveDups] = useState<Duplicate[]>([]);
  const [state, dispatch, pending] = useActionState<SaveContactState, Parameters<typeof saveContact>[1]>(
    saveContact,
    {},
  );
  const lastCheck = useRef("");

  const errors = state.fieldErrors ?? {};
  const set = <K extends keyof ContactFormValues>(key: K, v: ContactFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const familyCat = categories.find((c) => c.system_key === "military_family");
  const isFamily = !!familyCat && values.tags.some((t) => t.category_id === familyCat.id);
  const isPerson = values.kind === "person";

  async function checkDups() {
    const key = [values.email, values.first_name, values.last_name, values.zip].join("|").toLowerCase();
    if (key === lastCheck.current) return;
    lastCheck.current = key;
    const hasEmail = !!values.email?.trim();
    const hasNameZip = !!(values.first_name?.trim() && values.last_name?.trim() && values.zip?.trim());
    if (!hasEmail && !hasNameZip) {
      setLiveDups([]);
      return;
    }
    setLiveDups(
      await findDuplicates({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        zip: values.zip,
        excludeId: contactId,
      }),
    );
  }

  function submit(confirmDuplicates: boolean) {
    const payload = {
      ...values,
      veteran_id: isPerson && (isFamily || values.veteran_id) ? values.veteran_id : null,
      organization_id: isPerson ? values.organization_id : null,
      years_of_service: isPerson ? values.years_of_service : "",
    };
    startTransition(() => dispatch({ id: contactId, values: payload, confirmDuplicates }));
  }

  const blockingDups = state.duplicates ?? [];

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-6"
    >
      {state.formError && <Alert tone="error">{state.formError}</Alert>}

      <Card>
        <CardHeader title="Basic information" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Contact type">
            {(["person", "organization"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={values.kind === k}
                onClick={() => set("kind", k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium",
                  values.kind === k ? "bg-navy-800 text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {k === "person" ? <User className="size-4" /> : <Building2 className="size-4" />}
                {k === "person" ? "Person" : "Business / Organization"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {isPerson && (
              <>
                <Field label="First name" htmlFor="first_name" error={errors.first_name}>
                  <Input id="first_name" value={values.first_name} onChange={(e) => set("first_name", e.target.value)} onBlur={checkDups} autoComplete="off" />
                </Field>
                <Field label="Last name" htmlFor="last_name" error={errors.last_name}>
                  <Input id="last_name" value={values.last_name} onChange={(e) => set("last_name", e.target.value)} onBlur={checkDups} autoComplete="off" />
                </Field>
              </>
            )}
            <Field
              label={isPerson ? "Company / Organization" : "Organization name"}
              htmlFor="company"
              error={errors.company}
              className={isPerson ? "" : "sm:col-span-2"}
            >
              <Input id="company" value={values.company} onChange={(e) => set("company", e.target.value)} autoComplete="off" />
            </Field>
            <Field label={isPerson ? "Title" : "Main contact title"} htmlFor="title" error={errors.title}>
              <Input id="title" value={values.title} onChange={(e) => set("title", e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} hint="Optional">
              <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} onBlur={checkDups} autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone} hint="Optional">
              <Input id="phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />
            </Field>
            {isPerson && (
              <Field label="Years of military service" htmlFor="years_of_service" error={errors.years_of_service}>
                <Input
                  id="years_of_service"
                  inputMode="numeric"
                  value={values.years_of_service}
                  onChange={(e) => set("years_of_service", e.target.value)}
                  className="max-w-32"
                />
              </Field>
            )}
          </div>

          {!state.duplicates && <DuplicateWarning duplicates={liveDups} />}
        </div>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <div className="grid gap-4 p-4 sm:grid-cols-6 sm:p-5">
          <Field label="Street address" htmlFor="address" error={errors.address} className="sm:col-span-6">
            <Input id="address" value={values.address} onChange={(e) => set("address", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="City" htmlFor="city" error={errors.city} className="sm:col-span-3">
            <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="State" htmlFor="state" error={errors.state} className="sm:col-span-1">
            <Select id="state" value={values.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code} title={name}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ZIP" htmlFor="zip" error={errors.zip} className="sm:col-span-2">
            <Input id="zip" inputMode="numeric" value={values.zip} onChange={(e) => set("zip", e.target.value)} onBlur={checkDups} autoComplete="off" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Categories" description="Choose every category that applies." />
        <div className="space-y-4 p-4 sm:p-5">
          <CategoryPicker categories={categories} value={values.tags} onChange={(tags) => set("tags", tags)} />
        </div>
      </Card>

      {isPerson && (
        <Card>
          <CardHeader title="Connections" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {(isFamily || values.veteran_id) && (
              <Field label="Family of veteran" hint="The veteran this family member is connected to.">
                <ContactPicker
                  type="veteran"
                  value={values.veteran_id}
                  label={labels.veteran}
                  excludeId={contactId}
                  placeholder="Search veterans by name…"
                  onChange={(id, label) => {
                    set("veteran_id", id);
                    setLabels((l) => ({ ...l, veteran: label }));
                  }}
                />
              </Field>
            )}
            <Field label="Works at / member of" hint="Link to a Business / Organization contact.">
              <ContactPicker
                type="organization"
                value={values.organization_id}
                label={labels.organization}
                excludeId={contactId}
                placeholder="Search organizations…"
                onChange={(id, label) => {
                  set("organization_id", id);
                  setLabels((l) => ({ ...l, organization: label }));
                  if (id && label && !values.company?.trim()) set("company", label);
                }}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Notes" description="General notes. Use the timeline on the contact page for dated interactions." />
        <div className="p-4 sm:p-5">
          <Field label="Notes" htmlFor="notes" error={errors.notes}>
            <Textarea id="notes" rows={4} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <p className="mt-2 text-xs text-slate-500">
            Do not record health, medical, or diagnosis information in the CRM.
          </p>
        </div>
      </Card>

      {blockingDups.length > 0 && (
        <DuplicateWarning duplicates={blockingDups}>
          <p className="mt-2">Check the records above. If this really is a different contact, save it anyway.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => submit(true)} disabled={pending}>
              Save anyway
            </Button>
          </div>
        </DuplicateWarning>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : contactId ? "Save changes" : "Create contact"}
        </Button>
        <Link href={contactId ? `/contacts/${contactId}` : "/contacts"} className={buttonClasses("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
