import { type NextRequest } from "next/server";
import { getTopicById, addItem } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";
import type { Category } from "@/db";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_CATEGORIES: Category[] = [
  "video", "article", "paper", "repo", "podcast", "doc", "other",
];

interface BulkItem {
  title: string;
  url?: string;
  category?: string;
  duration?: number;
  tags?: string[];
}

/**
 * POST /api/topics/:id/subtasks/bulk
 * Body: { items: BulkItem[] }
 * Creates multiple items assigned to this topic in one call.
 * Returns: { created: Item[], errors: string[] }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id: topicId } = await context.params;

  if (!(await getTopicById(topicId))) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { items: inputItems } = body;

    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      return Response.json(
        { error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    if (inputItems.length > 100) {
      return Response.json(
        { error: "Maximum 100 items per bulk import" },
        { status: 400 }
      );
    }

    const created = [];
    const errors: string[] = [];

    for (let i = 0; i < inputItems.length; i++) {
      const entry = inputItems[i] as BulkItem;

      if (!entry.title || typeof entry.title !== "string" || !entry.title.trim()) {
        errors.push(`Item ${i}: title is required`);
        continue;
      }

      const cat: Category =
        typeof entry.category === "string" &&
        VALID_CATEGORIES.includes(entry.category as Category)
          ? (entry.category as Category)
          : "other";

      const item = {
        id: `itm${crypto.randomUUID()}`,
        title: entry.title.trim(),
        url: typeof entry.url === "string" ? entry.url.trim() : "",
        category: cat,
        tags: Array.isArray(entry.tags)
          ? entry.tags.filter((t: unknown) => typeof t === "string")
          : [],
        duration:
          typeof entry.duration === "number" && entry.duration > 0
            ? entry.duration
            : undefined,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now() + i,
        status: "unread" as const,
        topicIds: [topicId],
      };

      await addItem(item);
      created.push(item);
    }

    return Response.json({ created, errors }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
