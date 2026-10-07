import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { formatDateTime } from "@/lib/utils";
import { InviteForm, UserRowForm } from "./user-forms";
import { resendInvite, resetMfa } from "./actions";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const session = await requireRole("admin");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("is_active", { ascending: false }).order("email");

  // Sign-in details live in Supabase Auth (admin API, server only).
  const authInfo = new Map<string, { lastSignIn: string | null; confirmed: boolean; mfa: boolean }>();
  let authError: string | null = null;
  try {
    const { data, error } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      authInfo.set(u.id, {
        lastSignIn: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
        mfa: (u.factors ?? []).some((f) => f.status === "verified"),
      });
    }
  } catch (e) {
    authError = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <>
      <PageHeader title="Users" description="Invite people and choose what they can do." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Invite someone" description="They'll get an email with a link to set their password." />
          <div className="p-4 sm:p-5">
            <InviteForm />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="People with access"
            description="Admin: everything. Staff: create, edit, and view. Viewer: read-only."
          />
          {authError && (
            <Alert tone="warning" className="m-4">
              Could not load sign-in details ({authError}). Check SUPABASE_SECRET_KEY.
            </Alert>
          )}
          <ul className="divide-y divide-slate-100">
            {profiles?.map((p) => {
              const info = authInfo.get(p.id);
              const isSelf = p.id === session.userId;
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">
                      {p.full_name || p.email} {isSelf && <span className="text-xs font-normal text-slate-500">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-slate-500">{p.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!p.is_active && <Badge tone="red">Deactivated</Badge>}
                      {info && !info.confirmed && <Badge tone="amber">Invite pending</Badge>}
                      {info?.mfa ? <Badge tone="green">MFA on</Badge> : info ? <Badge tone="slate">MFA off</Badge> : null}
                      {info?.lastSignIn && (
                        <span className="text-xs text-slate-500">Last sign-in {formatDateTime(info.lastSignIn)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRowForm userId={p.id} role={p.role} isActive={p.is_active} isSelf={isSelf} />
                    {info && !info.confirmed && (
                      <ConfirmActionButton
                        size="sm"
                        variant="ghost"
                        action={resendInvite.bind(null, p.email)}
                        confirmText={`Resend the invitation email to ${p.email}?`}
                      >
                        Resend invite
                      </ConfirmActionButton>
                    )}
                    {info?.mfa && !isSelf && (
                      <ConfirmActionButton
                        size="sm"
                        variant="ghost"
                        action={resetMfa.bind(null, p.id)}
                        confirmText={`Reset two-step verification for ${p.email}? Use this if they lost their phone. They can set it up again after signing in.`}
                      >
                        Reset MFA
                      </ConfirmActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
