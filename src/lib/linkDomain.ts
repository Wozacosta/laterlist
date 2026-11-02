import type { Item } from "@/db";
import { itemKind } from "./itemKind";

/** The site a link is on, without `www`. */
export function linkDomain(url: string): string | null {
  return URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, "") : null;
}

/** The site to show on a row. A YouTube or Tweet badge already names it. */
export function itemDomain(item: Item): string | null {
  const kind = itemKind(item);
  return kind === "YouTube" || kind === "Tweet" ? null : linkDomain(item.url);
}
