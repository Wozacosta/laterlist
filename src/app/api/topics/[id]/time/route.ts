import { type NextRequest } from "next/server";
import { getTopicById, logTimeToTopic } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/topics/:id/time
 * Body: { seconds: number, source?: "manual" | "done" }
 * Logs time to a topic, updates timeSpent, and resets SR clock.
 * Returns: the created TimeLog
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  const { id } = await context.params;

  if (!getTopicById(id)) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { seconds, source } = body;

    if (typeof seconds !== "number" || seconds <= 0) {
      return Response.json(
        { error: "seconds must be a positive number" },
        { status: 400 }
      );
    }

    const src = source === "done" ? "done" : "manual";
    const log = logTimeToTopic(id, Math.round(seconds), src);

    if (!log) {
      return Response.json({ error: "Failed to log time" }, { status: 500 });
    }

    return Response.json(log, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
