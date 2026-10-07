import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-900 px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-white">
        <ShieldCheck className="size-8" aria-hidden />
        <span className="text-2xl font-bold tracking-wide">VETLIFE</span>
        <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">CRM</span>
      </div>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl sm:p-8">{children}</div>
      <p className="mt-6 text-center text-xs text-navy-200">Authorized VETLIFE staff and volunteers only.</p>
    </main>
  );
}
