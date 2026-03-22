import { type NextRequest } from "next/server";
import { readTopics, addTopic } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

/**
 * GET /api/topics
 * Query params: ?status=active|completed (optional filter)
 * Returns: Topic[]
 */
export async function GET(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let topics = await readTopics();

  if (status === "active" || status === "completed") {
    topics = topics.filter((t) => t.status === status);
  }

  return Response.json(topics);
}

/**
 * POST /api/topics
 * Body: { name: string, priority?: number, estimatedSeconds?: number }
 * Returns: the created Topic
 */
export async function POST(request: NextRequest) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { name, priority, estimatedSeconds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const p = typeof priority === "number" ? Math.max(1, Math.min(5, Math.round(priority))) : 3;

    const topic = {
      id: `top${crypto.randomUUID()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active" as const,
      timeSpent: 0,
      priority: p,
      estimatedSeconds: typeof estimatedSeconds === "number" ? Math.max(0, estimatedSeconds) : undefined,
      currentInterval: 1,
    };

    await addTopic(topic);

    return Response.json(topic, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
