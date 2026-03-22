import { type NextRequest } from "next/server";
import { getItemById, updateItem } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/items/:id/notes
 * Returns: { notes: string | null }
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;
  const item = await getItemById(id);

  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json({ notes: item.notes ?? null });
}

/**
 * PUT /api/items/:id/notes
 * Body: { notes: string }
 * Updates the item's notes. Send empty string to clear.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;

  try {
    const body = await request.json();

    if (typeof body.notes !== "string") {
      return Response.json({ error: "notes must be a string" }, { status: 400 });
    }

    const updated = await updateItem(id, {
      notes: body.notes || undefined,
    });

    if (!updated) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    return Response.json({ notes: updated.notes ?? null });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
