import type { Item } from "@/db";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isArchived(item: Item): boolean {
  return (
    item.status === "done" &&
    item.doneAt !== undefined &&
    Date.now() - new Date(item.doneAt).getTime() > SEVEN_DAYS_MS
  );
}
