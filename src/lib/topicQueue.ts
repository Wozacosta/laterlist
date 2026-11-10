import type { Item, Topic } from "@/db";

function isSnoozed(item: Item, now: number): boolean {
  return item.snoozedUntil != null && new Date(item.snoozedUntil).getTime() > now;
}

/** A topic's unread items, in order. The first one is its Next item. */
export function topicQueue(items: Item[], topicId: string, now = Date.now()): Item[] {
  return items
    .filter((item) => item.status === "unread" && item.topicIds?.includes(topicId))
    .filter((item) => !isSnoozed(item, now))
    .sort((a, b) => b.sortOrder - a.sortOrder);
}

/** When something in a topic was last finished, archived items included. */
export function topicLastDone(items: Item[], topicId: string): string | undefined {
  return items
    .filter((item) => item.status === "done" && item.doneAt && item.topicIds?.includes(topicId))
    .reduce<string | undefined>(
      (latest, item) => (!latest || item.doneAt! > latest ? item.doneAt : latest),
      undefined
    );
}

/** A topic's items that are waiting to come back, soonest first. */
export function topicSnoozed(items: Item[], topicId: string, now = Date.now()): Item[] {
  return items
    .filter((item) => item.status === "unread" && item.topicIds?.includes(topicId))
    .filter((item) => isSnoozed(item, now))
    .sort((a, b) => (a.snoozedUntil ?? "").localeCompare(b.snoozedUntil ?? ""));
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

/**
 * One Next item per Focus topic, in sidebar order, or per active topic when Focus has
 * none. Started items always show, and come first.
 */
export function nextByTopic(topics: Topic[], items: Item[], now = Date.now()): { topic: Topic; item: Item }[] {
  const seen = new Set<string>();

  const rows = topics
    .filter((topic) => topic.status === "active")
    .sort((a, b) => Number(Boolean(b.focus)) - Number(Boolean(a.focus)) || a.sortOrder - b.sortOrder)
    .flatMap((topic) => {
      const item = topicQueue(items, topic.id, now).find(({ id }) => !seen.has(id));
      if (!item) return [];
      seen.add(item.id);
      return [{ topic, item }];
    })
    .sort((a, b) => Number(Boolean(b.item.progress)) - Number(Boolean(a.item.progress)));

  return rows.some((row) => row.topic.focus)
    ? rows.filter((row) => row.topic.focus || row.item.progress)
    : rows;
}
