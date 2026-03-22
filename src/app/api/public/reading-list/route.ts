import { NextResponse } from "next/server";
import { readItems } from "@/lib/server/store";
import { readTopics } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/**
 * Public endpoint returning all "done" articles.
 * Consumed by woza.ink at build time for the /reading page.
 */
export async function GET() {
  const [items, topics] = await Promise.all([readItems(), readTopics()]);

  const topicMap = new Map(topics.map((t) => [t.id, t.name]));

  const done = items
    .filter((item) => item.status === "done" && item.doneAt)
    .sort(
      (a, b) =>
        new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime(),
    )
    .map((item) => ({
      title: item.title,
      url: item.url,
      category: item.category,
      tags: item.tags,
      doneAt: item.doneAt,
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
