import { sortTags, type TagRow } from "@/lib/data";
import { Badge } from "@/components/ui";

export function TagList({ tags, max }: { tags: TagRow[]; max?: number }) {
  const sorted = sortTags(tags);
  const shown = max ? sorted.slice(0, max) : sorted;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <Badge key={t.id}>
          {t.categories?.name}
          {t.subcategories?.name && <span className="font-normal opacity-80">· {t.subcategories.name}</span>}
        </Badge>
      ))}
      {max && sorted.length > max && <Badge tone="slate">+{sorted.length - max}</Badge>}
    </div>
  );
}
