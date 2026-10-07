"use client";

import { Check } from "lucide-react";
import type { CategoryWithSubs, TagRef } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Checkbox per category; when a category with subcategories is checked, its
 * subcategories appear as toggle chips. Inactive categories only appear when
 * the contact already has them, so existing tags are never silently dropped.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: CategoryWithSubs[];
  value: TagRef[];
  onChange: (tags: TagRef[]) => void;
}) {
  const selectedCats = new Set(value.map((t) => t.category_id));
  const selectedSubs = new Set(value.filter((t) => t.subcategory_id).map((t) => t.subcategory_id!));

  const visible = categories.filter((c) => c.is_active || selectedCats.has(c.id));

  function toggleCategory(cat: CategoryWithSubs) {
    if (selectedCats.has(cat.id)) {
      onChange(value.filter((t) => t.category_id !== cat.id));
    } else {
      onChange([...value, { category_id: cat.id, subcategory_id: null }]);
    }
  }

  function toggleSub(cat: CategoryWithSubs, subId: string) {
    const others = value.filter((t) => t.category_id !== cat.id);
    const subs = new Set(value.filter((t) => t.category_id === cat.id && t.subcategory_id).map((t) => t.subcategory_id!));
    if (subs.has(subId)) subs.delete(subId);
    else subs.add(subId);
    const mine: TagRef[] =
      subs.size === 0
        ? [{ category_id: cat.id, subcategory_id: null }]
        : [...subs].map((s) => ({ category_id: cat.id, subcategory_id: s }));
    onChange([...others, ...mine]);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {visible.map((cat) => {
        const checked = selectedCats.has(cat.id);
        const subs = cat.subcategories.filter((s) => s.is_active || selectedSubs.has(s.id));
        return (
          <div
            key={cat.id}
            className={cn(
              "rounded-md border px-3 py-2 transition-colors",
              checked ? "border-navy-300 bg-navy-50" : "border-slate-200 bg-white",
            )}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCategory(cat)}
                className="size-4 rounded border-slate-300 accent-navy-700"
              />
              {cat.name}
              {!cat.is_active && <span className="text-xs font-normal text-slate-500">(inactive)</span>}
            </label>
            {checked && subs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-6" role="group" aria-label={`${cat.name} type`}>
                {subs.map((s) => {
                  const on = selectedSubs.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSub(cat, s.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                        on
                          ? "border-navy-700 bg-navy-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-navy-400",
                      )}
                    >
                      {on && <Check className="size-3" aria-hidden />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
