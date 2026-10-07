"use client";

import { Alert, Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Alert tone="error" title="Something went wrong">
        <p>The page couldn&apos;t load. Please try again. If it keeps happening, tell an administrator.</p>
        {error.digest && <p className="mt-1 text-xs opacity-75">Reference: {error.digest}</p>}
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
