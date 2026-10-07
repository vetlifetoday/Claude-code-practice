import Link from "next/link";
import type { Duplicate } from "@/app/(app)/contacts/actions";
import { Alert } from "@/components/ui";

export function DuplicateWarning({ duplicates, children }: { duplicates: Duplicate[]; children?: React.ReactNode }) {
  if (duplicates.length === 0) return null;
  return (
    <Alert tone="warning" title="This may be a duplicate">
      <ul className="mt-1 space-y-1">
        {duplicates.map((d) => (
          <li key={d.id}>
            {d.is_archived ? (
              <span className="font-medium">{d.display_name}</span>
            ) : (
              <Link href={`/contacts/${d.id}`} target="_blank" className="font-medium underline">
                {d.display_name}
              </Link>
            )}{" "}
            <span className="text-amber-900/80">
              — {d.reason}
              {d.email ? ` · ${d.email}` : ""}
              {d.city || d.state ? ` · ${[d.city, d.state].filter(Boolean).join(", ")}` : ""}
              {d.is_archived ? " · archived" : ""}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </Alert>
  );
}
