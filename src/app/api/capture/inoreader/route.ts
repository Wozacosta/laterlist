import { type NextRequest } from "next/server";
import { captureItem } from "@/lib/server/captureItem";
import { requireCaptureToken } from "@/lib/server/mcpAuth";

const MAX_ARTICLES = 20;

interface InoreaderArticle {
  title?: string;
  canonical?: { href?: string }[];
  alternate?: { href?: string }[];
}

function articleUrl(article: InoreaderArticle): string | undefined {
  const url = article.canonical?.[0]?.href ?? article.alternate?.[0]?.href;
  return url && /^https?:\/\//i.test(url) && URL.canParse(url) ? url : undefined;
}

/**
 * POST /api/capture/inoreader — takes an Inoreader rule's "Trigger webhook" call.
 * Inoreader documents no signature or custom header, so the token sits in the address.
 */
export async function POST(request: NextRequest) {
  const denied = requireCaptureToken(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const articles: InoreaderArticle[] = Array.isArray(body?.items) ? body.items : body ? [body] : [];

  let added = 0;
  let skipped = 0;

  for (const article of articles.slice(0, MAX_ARTICLES)) {
    const url = articleUrl(article);
    if (!url) {
      skipped += 1;
      continue;
    }

    const { duplicate } = await captureItem({ url, title: article.title?.slice(0, 300) }).catch(() => ({ duplicate: true }));
    if (duplicate) skipped += 1;
    else added += 1;
  }

  return Response.json({ added, skipped });
}
