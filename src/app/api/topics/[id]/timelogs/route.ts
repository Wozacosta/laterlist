import { type NextRequest } from "next/server";
import { getTopicById, getTimeLogsByTopicId } from "@/lib/server/store";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/topics/:id/timelogs
 * Query params: ?limit=N (optional, default all)
 * Returns: TimeLog[] sorted by loggedAt descending (newest first)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!getTopicById(id)) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const limitStr = searchParams.get("limit");

  let logs = getTimeLogsByTopicId(id);

  // Sort newest first
  logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

  if (limitStr) {
    const limit = parseInt(limitStr, 10);
    if (limit > 0) {
      logs = logs.slice(0, limit);
    }
  }

  return Response.json(logs);
}
