import type { Item } from "@/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_AGE_DAYS = 3;

function lastSeen(item: Item): string {
  return item.recalledAt ?? item.doneAt ?? "";
}

/** The finished item that's gone longest without a recall, at most one a day. */
export function pickRecall(items: Item[], now = Date.now()): Item | null {
  const today = new Date(now).toDateString();
  const finished = items.filter((item) => item.status === "done" && item.doneAt);

  if (finished.some((item) => item.recalledAt && new Date(item.recalledAt).toDateString() === today)) {
    return null;
  }

  const due = finished
    .filter((item) => now - new Date(lastSeen(item)).getTime() >= MIN_AGE_DAYS * DAY_MS)
    .sort((a, b) => lastSeen(a).localeCompare(lastSeen(b)));

  return due[0] ?? null;
}
