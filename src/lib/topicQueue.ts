import type { Item } from "@/db";

/** A topic's unread items, in order. The first one is its Next item. */
export function topicQueue(items: Item[], topicId: string): Item[] {
  return items
    .filter((item) => item.status === "unread" && item.topicIds?.includes(topicId))
    .sort((a, b) => b.sortOrder - a.sortOrder);
}

/** A topic's finished items, most recent first. */
export function topicLearned(items: Item[], topicId: string): Item[] {
  return items
    .filter((item) => item.status === "done" && item.topicIds?.includes(topicId))
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
}

/** Swaps one topic for another, keeping any others the item belongs to. */
export function replaceTopic(topicIds: string[], from: string, to: string): string[] {
  return [...new Set(topicIds.map((id) => (id === from ? to : id)))];
}
