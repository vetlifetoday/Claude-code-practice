"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Archive,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Tags,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Users };

export function AppShell({
  children,
  user,
  role,
  signOut,
}: {
  children: ReactNode;
  user: { name: string; email: string };
  role: "admin" | "staff" | "viewer";
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const main: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/contacts", label: "Contacts", icon: Users },
  ];

  const admin: NavItem[] =
    role === "admin"
      ? [
          { href: "/admin/categories", label: "Categories", icon: Tags },
          { href: "/admin/users", label: "Users", icon: UserCog },
          { href: "/admin/archive", label: "Archive", icon: Archive },
        ]
      : [];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const link = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive(item.href) ? "bg-white/15 text-white" : "text-navy-100 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-4" aria-hidden />
      {item.label}
    </Link>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900 px-3 py-4">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-white" onClick={() => setOpen(false)}>
        <ShieldCheck className="size-6" aria-hidden />
        <span className="text-lg font-bold tracking-wide">VETLIFE</span>
        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">CRM</span>
      </Link>
      <nav className="flex-1 space-y-1" aria-label="Main">
        {main.map(link)}
        {admin.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-navy-300">Admin</p>
            {admin.map(link)}
          </>
        )}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="block rounded-md px-3 py-2 text-sm text-navy-100 hover:bg-white/10"
        >
          <span className="block truncate font-medium text-white">{user.name}</span>
          <span className="block truncate text-xs capitalize">{role} · My account</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-wide">
          <ShieldCheck className="size-5" aria-hidden /> VETLIFE
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-md p-1.5 hover:bg-white/10"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 rounded-md p-1.5 text-white hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
