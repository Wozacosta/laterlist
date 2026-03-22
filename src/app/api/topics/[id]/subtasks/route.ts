import { type NextRequest } from "next/server";
import {
  getTopicById,
  getItemsByTopicId,
  addItem,
  deleteItem,
  getItemById,
} from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";
import type { Category } from "@/db";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_CATEGORIES: Category[] = [
  "video", "article", "paper", "repo", "podcast", "doc", "other",
];

/**
 * GET /api/topics/:id/subtasks
 * Returns: Item[] assigned to this topic
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id } = await context.params;

  if (!getTopicById(id)) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  return Response.json(getItemsByTopicId(id));
}

/**
 * POST /api/topics/:id/subtasks
 * Body: { title: string, url?: string, category?: Category, duration?: number, tags?: string[] }
 * Creates a new item assigned to this topic.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id: topicId } = await context.params;

  if (!getTopicById(topicId)) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { title, url, category, duration, tags } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const cat: Category =
      typeof category === "string" && VALID_CATEGORIES.includes(category as Category)
        ? (category as Category)
        : "other";

    const item = {
      id: `itm${crypto.randomUUID()}`,
      title: title.trim(),
      url: typeof url === "string" ? url.trim() : "",
      category: cat,
      tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string") : [],
      duration: typeof duration === "number" && duration > 0 ? duration : undefined,
      addedAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "unread" as const,
      topicIds: [topicId],
    };

    addItem(item);

    return Response.json(item, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * DELETE /api/topics/:id/subtasks
 * Body: { itemId: string }
 * Removes an item from this topic (deletes if it belongs to no other topics).
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const { id: topicId } = await context.params;

  if (!getTopicById(topicId)) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId || typeof itemId !== "string") {
      return Response.json({ error: "itemId is required" }, { status: 400 });
    }

    const item = getItemById(itemId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.topicIds?.includes(topicId)) {
      return Response.json(
        { error: "Item is not assigned to this topic" },
        { status: 400 }
      );
    }

    // If item belongs to only this topic, delete it entirely
    // Otherwise, just remove it from this topic
    const otherTopics = (item.topicIds ?? []).filter((t) => t !== topicId);
    if (otherTopics.length === 0) {
      deleteItem(itemId);
    } else {
      const { updateItem } = await import("@/lib/server/store");
      updateItem(itemId, { topicIds: otherTopics });
    }

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
