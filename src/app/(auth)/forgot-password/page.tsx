import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-slate-600">We&apos;ll email you a link to choose a new password.</p>
      <ForgotForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-navy-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
