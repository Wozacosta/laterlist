import { type NextRequest } from "next/server";
import { readTopics, readItems } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";

interface SearchResult {
  type: "topic" | "item";
  id: string;
  title: string;
  matchField: string;
  snippet: string;
  topicId?: string;
}

/**
 * GET /api/search?q=keyword
 * Searches across topics (name, notes), items (title, url, notes, tags).
 * Returns matched results with snippets.
 */
export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 1) {
    return Response.json({ error: "q parameter is required" }, { status: 400 });
  }

  const topics = readTopics();
  const items = readItems();
  const results: SearchResult[] = [];

  // Search topics
  for (const topic of topics) {
    if (topic.name.toLowerCase().includes(q)) {
      results.push({
        type: "topic",
        id: topic.id,
        title: topic.name,
        matchField: "name",
        snippet: topic.name,
      });
    } else if (topic.notes && topic.notes.toLowerCase().includes(q)) {
      results.push({
        type: "topic",
        id: topic.id,
        title: topic.name,
        matchField: "notes",
        snippet: extractSnippet(topic.notes, q),
      });
    }
  }

  // Search items
  for (const item of items) {
    if (item.title.toLowerCase().includes(q)) {
      results.push({
        type: "item",
        id: item.id,
        title: item.title,
        matchField: "title",
        snippet: item.title,
        topicId: item.topicIds?.[0],
      });
    } else if (item.url && item.url.toLowerCase().includes(q)) {
      results.push({
        type: "item",
        id: item.id,
        title: item.title,
        matchField: "url",
        snippet: item.url,
        topicId: item.topicIds?.[0],
      });
    } else if (item.notes && item.notes.toLowerCase().includes(q)) {
      results.push({
        type: "item",
        id: item.id,
        title: item.title,
        matchField: "notes",
        snippet: extractSnippet(item.notes, q),
        topicId: item.topicIds?.[0],
      });
    } else if (item.tags.some((t) => t.toLowerCase().includes(q))) {
      results.push({
        type: "item",
        id: item.id,
        title: item.title,
        matchField: "tags",
        snippet: item.tags.join(", "),
        topicId: item.topicIds?.[0],
      });
    }
  }

  return Response.json(results);
}

/** Extract a snippet around the first match of query in text. */
function extractSnippet(text: string, query: string, radius = 60): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}
