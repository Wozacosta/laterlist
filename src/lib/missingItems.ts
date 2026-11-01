import type { Item } from "@/db";

function urlKey(item: Item): string {
  return item.url.replace(/\/$/, "");
}

/**
 * The backup items this list doesn't have yet, matched by id or link. Sync fields are
 * dropped so each item lands in the current user's realm, not the one it was exported from.
 */
export function missingItems(backup: Item[], existing: Item[]): Item[] {
  const ids = new Set(existing.map((item) => item.id));
  const urls = new Set(existing.map(urlKey).filter(Boolean));
  const missing: Item[] = [];

  for (const item of backup) {
    const url = urlKey(item);
    if (ids.has(item.id) || (url && urls.has(url))) continue;

    ids.add(item.id);
    if (url) urls.add(url);

    const { realmId: _realmId, owner: _owner, ...fresh } = item as Item & {
      realmId?: string;
      owner?: string;
    };
    missing.push(fresh);
  }
  return missing;
}
