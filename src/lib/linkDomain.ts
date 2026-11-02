import type { Item } from "@/db";
import { itemKind } from "./itemKind";

/** The site a link is on, without `www`. */
export function linkDomain(url: string): string | null {
  return URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, "") : null;
}

/** Where an item comes from: its channel, or else its site, unless the YouTube or Tweet badge already names that. */
export function itemSource(item: Item): string | null {
  if (item.author) return item.author;
  const kind = itemKind(item);
  return kind === "YouTube" || kind === "Tweet" ? null : linkDomain(item.url);
}
