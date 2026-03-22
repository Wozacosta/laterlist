import { type NextRequest } from "next/server";
import { getTopicById, updateTopic } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/study-queue/:id/studied
 * Marks a topic as studied — resets SR clock without logging time.
 * Returns: the updated Topic
 */
export async function POST(
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

  const updated = updateTopic(id, {
    lastActivityDate: new Date().toISOString(),
    currentInterval: 1,
  });

  if (!updated) {
    return Response.json({ error: "Failed to update topic" }, { status: 500 });
  }

  return Response.json(updated);
}
