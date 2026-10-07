import { Building2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  kind,
  size = "md",
}: {
  name: string;
  src?: string | null;
  kind: "person" | "organization";
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "size-8 text-xs", md: "size-12 text-base", lg: "size-20 text-2xl" }[size];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
    return <img src={src} alt="" className={cn(dims, "shrink-0 rounded-full border border-slate-200 bg-white object-cover")} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        dims,
        "inline-flex shrink-0 items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-700",
      )}
    >
      {kind === "organization" ? <Building2 className="size-1/2" /> : initials(name)}
    </span>
  );
}
