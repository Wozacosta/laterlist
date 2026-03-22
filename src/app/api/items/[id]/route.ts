import { type NextRequest } from "next/server";
import { getItemById, updateItem } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/items/:id
 * Body: { status: "done" | "unread" }
 * Marks an item as done or unread.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;

  const item = getItemById(id);
  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== "done" && status !== "unread") {
      return Response.json(
        { error: 'status must be "done" or "unread"' },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = { status };

    if (status === "done") {
      patch.doneAt = new Date().toISOString();
    } else {
      patch.doneAt = undefined;
    }

    const updated = updateItem(id, patch);

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
