import { type NextRequest } from "next/server";
import { getTopicById, updateTopic, deleteTopic } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/topics/:id
 * Returns: a single Topic, or 404
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

  return Response.json(topic);
}

/**
 * PUT /api/topics/:id
 * Body: partial Topic fields to update (name, priority, status, estimatedSeconds, notes, dependsOn)
 * Returns: the updated Topic
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
    const allowed: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      allowed.name = body.name.trim();
    }
    if (typeof body.priority === "number") {
      allowed.priority = Math.max(1, Math.min(5, Math.round(body.priority)));
    }
    if (body.status === "active" || body.status === "completed") {
      allowed.status = body.status;
      if (body.status === "completed") {
        allowed.completedAt = new Date().toISOString();
      } else {
        allowed.completedAt = undefined;
      }
    }
    if (typeof body.estimatedSeconds === "number") {
      allowed.estimatedSeconds = Math.max(0, body.estimatedSeconds);
    }
    if (typeof body.notes === "string") {
      allowed.notes = body.notes || undefined;
    }
    if (Array.isArray(body.dependsOn)) {
      allowed.dependsOn = body.dependsOn.filter(
        (d: unknown) => typeof d === "string"
      );
    }

    if (Object.keys(allowed).length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = updateTopic(id, allowed);

    if (!updated) {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * DELETE /api/topics/:id
 * Returns: 204 on success, 404 if not found
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;
  const deleted = deleteTopic(id);

  if (!deleted) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
