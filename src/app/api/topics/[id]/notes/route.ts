import { type NextRequest } from "next/server";
import { getTopicById, updateTopic } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/topics/:id/notes
 * Returns: { notes: string | null }
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;
  const topic = getTopicById(id);

  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  return Response.json({ notes: topic.notes ?? null });
}

/**
 * PUT /api/topics/:id/notes
 * Body: { notes: string }
 * Updates the topic's markdown notes. Send empty string to clear.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;

  try {
    const body = await request.json();

    if (typeof body.notes !== "string") {
      return Response.json({ error: "notes must be a string" }, { status: 400 });
    }

    const updated = updateTopic(id, {
      notes: body.notes || undefined,
    });

    if (!updated) {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }

    return Response.json({ notes: updated.notes ?? null });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
