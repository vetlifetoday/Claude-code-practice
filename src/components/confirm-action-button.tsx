"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui";

/** Button that asks for confirmation, then runs a server action. */
export function ConfirmActionButton({
  action,
  confirmText,
  children,
  variant = "secondary",
  size,
  pendingText = "Working…",
}: {
  action: () => Promise<{ error?: string } | void>;
  confirmText: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  pendingText?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const res = await action();
            if (res && res.error) setError(res.error);
          });
        }}
      >
        {pending ? pendingText : children}
      </Button>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}
