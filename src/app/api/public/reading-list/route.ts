import { type NextRequest, NextResponse } from "next/server";
import { readItems, readTopics } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

export const dynamic = "force-dynamic";

/**
 * Authenticated endpoint returning all published articles.
 * Consumed by woza.ink at build time for the /reading page.
 * Requires API key: Authorization: Bearer <key>
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const [items, topics] = await Promise.all([readItems(), readTopics()]);

  const topicMap = new Map(topics.map((t) => [t.id, t.name]));

  const done = items
    .filter((item) => item.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime(),
    )
    .map((item) => ({
      title: item.title,
      url: item.url,
      category: item.category,
      tags: item.tags,
      doneAt: item.doneAt ?? item.publishedAt,
      addedAt: item.addedAt,
      notes: item.notes ?? null,
      topics: (item.topicIds ?? [])
        .map((id) => topicMap.get(id))
        .filter(Boolean),
    }));

  return NextResponse.json(done, {
    headers: {
      "Access-Control-Allow-Origin": "https://woza.ink",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
