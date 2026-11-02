import type { Item } from "@/db";

/** True when every word appears somewhere in the item's text, in any order. */
export function matchesSearch(item: Item, query: string): boolean {
  const text = [item.title, item.url, item.author, item.notes, item.summary, item.why, ...item.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
