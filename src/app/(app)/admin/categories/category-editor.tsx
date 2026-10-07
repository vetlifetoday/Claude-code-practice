"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { addCategory, addSubcategory, updateItem } from "./actions";
import type { ActionResult, CategoryWithSubs, Subcategory } from "@/lib/types";
import { Alert, Badge, Card, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return state.ok ? (
    <span className="text-xs text-emerald-700">{state.message}</span>
  ) : (
    <span className="text-xs text-red-700">{state.error}</span>
  );
}

function ItemRow({
  table,
  item,
  usage,
}: {
  table: "categories" | "subcategories";
  item: { id: string; name: string; sort_order: number; is_active: boolean };
  usage?: number;
}) {
  const [state, action] = useActionState(updateItem.bind(null, table, item.id), null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="name" defaultValue={item.name} aria-label="Name" className="w-full min-w-40 flex-1 sm:w-auto" required />
      <Input
        name="sort_order"
        type="number"
        defaultValue={item.sort_order}
        aria-label="Sort order"
        title="Sort order (lower numbers first)"
        className="w-20"
      />
      <label className="flex items-center gap-1.5 text-sm text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={item.is_active} className="size-4 accent-navy-700" />
        Active
      </label>
      <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
        Save
      </SubmitButton>
      {usage !== undefined && <span className="text-xs text-slate-500">{usage} contacts</span>}
      <Status state={state} />
    </form>
  );
}

function AddForm({
  action,
  placeholder,
  categoryId,
}: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  placeholder: string;
  categoryId?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {categoryId && <input type="hidden" name="category_id" value={categoryId} />}
      <Input name="name" placeholder={placeholder} aria-label={placeholder} className="min-w-40 flex-1" required />
      <SubmitButton size="sm" pendingText="Adding…">
        <Plus className="size-4" aria-hidden /> Add
      </SubmitButton>
      <Status state={state} />
    </form>
  );
}

export function CategoryEditor({
  categories,
  usage,
}: {
  categories: CategoryWithSubs[];
  usage: Record<string, number>;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Categories can be renamed or deactivated, but not deleted, so existing contacts keep their history.
        Deactivated items no longer appear on the contact form. Lower sort numbers appear first.
      </Alert>

      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Add a category</h2>
        <AddForm action={addCategory} placeholder="New category name" />
      </Card>

      <Card className="divide-y divide-slate-100">
        {categories.map((cat) => {
          const isOpen = open.has(cat.id);
          return (
            <div key={cat.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggle(cat.id)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Hide" : "Show"} subcategories of ${cat.name}`}
                  className="mt-1.5 rounded p-0.5 text-slate-500 hover:bg-slate-100"
                >
                  {isOpen ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <ItemRow table="categories" item={cat} usage={usage[cat.id] ?? 0} />
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {!cat.is_active && <Badge tone="amber">Inactive</Badge>}
                    {cat.subcategories.length > 0 ? (
                      cat.subcategories.map((s) => (
                        <Badge key={s.id} tone={s.is_active ? "slate" : "amber"} className={cn(!s.is_active && "line-through")}>
                          {s.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No subcategories</span>
                    )}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-l-2 border-navy-100 pl-4 sm:ml-8">
                  {cat.subcategories.map((s: Subcategory) => (
                    <ItemRow key={s.id} table="subcategories" item={s} usage={usage[s.id] ?? 0} />
                  ))}
                  <AddForm action={addSubcategory} categoryId={cat.id} placeholder={`New ${cat.name} subcategory`} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
