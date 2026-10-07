import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
        Go to the dashboard
      </Link>
    </main>
  );
}
