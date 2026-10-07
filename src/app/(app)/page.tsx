import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Card, LinkButton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const [sp, session] = await Promise.all([searchParams, requireSession()]);
  const supabase = await createClient();
  const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).is("archived_at", null);

  return (
    <>
      <PageHeader
        title={`Welcome${session.profile.full_name ? `, ${session.profile.full_name.split(" ")[0]}` : ""}`}
        description="VETLIFE contact management"
        actions={
          session.canEdit && (
            <LinkButton href="/contacts/new">
              <Plus className="size-4" aria-hidden /> New contact
            </LinkButton>
          )
        }
      />
      {sp.denied && <Alert tone="warning" className="mb-4">You don&apos;t have access to that page.</Alert>}
      <Link href="/contacts" className="block max-w-xs">
        <Card className="flex items-center gap-4 p-5 hover:border-navy-300">
          <span className="rounded-md bg-navy-100 p-3 text-navy-700">
            <Users className="size-6" aria-hidden />
          </span>
          <span>
            <span className="block text-3xl font-semibold text-navy-900">{(count ?? 0).toLocaleString()}</span>
            <span className="text-sm text-slate-600">Active contacts</span>
          </span>
        </Card>
      </Link>
    </>
  );
}
