import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { PasswordForm } from "../password-form";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader
        title="Welcome to the VETLIFE CRM"
        description="Choose a password to finish setting up your account."
      />
      <Card className="max-w-md p-5">
        <PasswordForm welcome defaultName={session.profile.full_name ?? ""} />
      </Card>
    </>
  );
}
