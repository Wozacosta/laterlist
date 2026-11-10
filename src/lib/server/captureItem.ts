import type { Item } from "@/db";
import { linkKey } from "@/lib/linkKey";
import { readRows, writeRows } from "./dexieCloud";
import { lookUpLink } from "./lookUpLink";

interface Capture {
  url: string;
  title?: string;
  notes?: string;
}

export interface Captured {
  id: string;
  title: string;
  duplicate: boolean;
}

/**
 * Saves a link from outside the app. A repeat is left alone, even if it's in the
 * Trash, and a page that won't load still gets saved under its link.
 */
export async function captureItem({ url, title, notes }: Capture): Promise<Captured> {
  const items = await readRows<Item>("items");
  const key = linkKey(url);
  const existing = items.find((item) => item.url && linkKey(item.url) === key);
  if (existing) return { id: existing.id, title: existing.title, duplicate: true };

  const found = await lookUpLink(url).catch(() => null);
  const item: Item = {
    id: `itm${crypto.randomUUID()}`,
    url,
    title: title || found?.title || url,
    category: found?.category ?? "other",
    tags: found?.tags ?? [],
    addedAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "unread",
    ...(found?.thumbnail && { thumbnail: found.thumbnail }),
    ...(found?.author && { author: found.author }),
    ...(found?.duration != null && { duration: found.duration }),
    ...(found?.summary && { summary: found.summary }),
    ...(notes && { notes }),
  };

  await writeRows("items", [item]);
  return { id: item.id, title: item.title, duplicate: false };
}
