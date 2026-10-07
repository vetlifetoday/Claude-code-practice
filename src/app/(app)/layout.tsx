import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { signOut } from "@/app/(auth)/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  return (
    <AppShell
      user={{ name: session.profile.full_name || session.email, email: session.email }}
      role={session.role}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
