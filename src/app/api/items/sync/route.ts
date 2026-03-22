import { type NextRequest } from "next/server";
import { readItems, writeItems } from "@/lib/server/store";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * PUT /api/items/sync
 * Upserts an item into the server store.
 * Called by the client when publishing an item.
 *
 * No auth required — runs from the same origin.
 */
export async function PUT(request: NextRequest) {
  try {
    const item = await request.json();
    if (!item.id || !item.title) {
      return Response.json({ error: "id and title required" }, { status: 400 });
    }

    // Decode HTML entities in title (e.g. &#x27; → ')
    if (item.title) item.title = decodeHtmlEntities(item.title);

    const items = await readItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...item };
    } else {
      items.push(item);
    }
    await writeItems(items);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
