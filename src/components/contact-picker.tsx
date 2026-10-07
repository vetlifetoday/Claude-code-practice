"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { searchLinkCandidates } from "@/app/(app)/contacts/actions";
import { Input } from "@/components/ui";

type Option = { id: string; display_name: string; city: string | null; state: string | null; company: string | null };

export function ContactPicker({
  type,
  value,
  label,
  onChange,
  excludeId,
  placeholder,
}: {
  type: "veteran" | "organization";
  value: string | null;
  label: string | null;
  onChange: (id: string | null, label: string | null) => void;
  excludeId?: string | null;
  placeholder: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(q: string) {
    setQuery(q);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const rows = await searchLinkCandidates(q, type);
        setOptions(rows.filter((r) => r.id !== excludeId));
        setActive(0);
      });
    }, 200);
  }

  function choose(o: Option) {
    onChange(o.id, o.display_name);
    setQuery("");
    setOpen(false);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
        <span className="truncate font-medium text-navy-800">{label ?? "Linked contact"}</span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Remove link"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        className="pl-9"
        onFocus={() => search(query)}
        onChange={(e) => search(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-slate-500">
              {pending ? "Searching…" : type === "veteran" ? "No veterans found." : "No organizations found."}
            </li>
          )}
          {options.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-navy-50" : ""}`}
            >
              <span className="font-medium">{o.display_name}</span>
              {(o.city || o.state) && (
                <span className="ml-2 text-xs text-slate-500">{[o.city, o.state].filter(Boolean).join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
