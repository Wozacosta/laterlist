import { type NextRequest } from "next/server";
import { fetchYouTubeMetadata, fetchArticleMetadata } from "./metadata";
import { inferCategoryAndTags } from "./ai";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, remaining, resetAt } = rateLimit(ip);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return Response.json(
      { error: "Too many requests — please slow down" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return Response.json({ error: "Missing or invalid url" }, { status: 400 });
    }

    // Guard against absurdly long URLs
    if (url.length > 2048) {
      return Response.json({ error: "URL too long" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json({ error: "URL must use http or https" }, { status: 400 });
    }

    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    const metadata = isYouTube
      ? await fetchYouTubeMetadata(url)
      : await fetchArticleMetadata(url);

    const { category, tags } = await inferCategoryAndTags(
      metadata.title,
      metadata.description
    );

    return Response.json(
      {
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        category,
        tags,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
