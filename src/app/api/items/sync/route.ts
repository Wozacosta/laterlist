import { type NextRequest } from "next/server";
import { readItems, writeItems } from "@/lib/server/store";

/**
 * PUT /api/items/sync
 * Upserts an item into the server store.
 * Called by the client when marking an item as done,
 * so the reading-list API can serve it to woza.ink.
 *
 * No auth required — runs from the same origin.
 */
export async function PUT(request: NextRequest) {
  try {
    const item = await request.json();
    if (!item.id || !item.title) {
      return Response.json({ error: "id and title required" }, { status: 400 });
    }

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
