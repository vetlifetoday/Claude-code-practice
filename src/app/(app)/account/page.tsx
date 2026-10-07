import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/utils";
import { NameForm } from "./name-form";
import { PasswordForm } from "./password-form";
import { MfaSettings } from "./mfa-settings";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader
        title="My account"
        description={
          <>
            {session.email} · <Badge>{ROLE_LABELS[session.role]}</Badge>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <div className="p-4 sm:p-5">
            <NameForm defaultName={session.profile.full_name ?? ""} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Password" />
          <div className="p-4 sm:p-5">
            <PasswordForm />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Two-step verification (MFA)" />
          <div className="p-4 sm:p-5">
            <MfaSettings />
          </div>
        </Card>
      </div>
    </>
  );
}
