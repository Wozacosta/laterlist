import { type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface PlaylistVideo {
  videoId: string;
  title: string;
  duration: number | null; // seconds
  thumbnail: string;
}

/**
 * POST /api/playlist
 * Body: { url: string }  — a YouTube playlist URL
 * Returns: { title: string, videos: PlaylistVideo[] }
 *
 * Scrapes the YouTube playlist page and extracts embedded JSON data
 * to get video titles and durations without requiring an API key.
 */
export async function POST(request: NextRequest) {
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

    // Extract playlist ID from URL
    const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (!listMatch) {
      return Response.json(
        { error: "Not a valid YouTube playlist URL — must contain a list= parameter" },
        { status: 400 }
      );
    }

    const listId = listMatch[1];
    const playlistUrl = `https://www.youtube.com/playlist?list=${listId}`;

    const res = await fetch(playlistUrl, {
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json(
        { error: `YouTube returned ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Extract the playlist title from og:title or <title>
    const playlistTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/ - YouTube$/, "") ??
      "Playlist";

    // YouTube embeds video data in ytInitialData JSON
    // Use [\s\S] instead of the /s flag for broader TS target compatibility
    const dataMatch = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (!dataMatch) {
      return Response.json(
        { error: "Could not parse playlist data from YouTube" },
        { status: 502 }
      );
    }

    let ytData: Record<string, unknown>;
    try {
      ytData = JSON.parse(dataMatch[1]);
    } catch {
      return Response.json(
        { error: "Failed to parse YouTube data" },
        { status: 502 }
      );
    }

    const videos = extractVideos(ytData);

    if (videos.length === 0) {
      return Response.json(
        { error: "No videos found in playlist — it may be private or empty" },
        { status: 404 }
      );
    }

    return Response.json(
      { title: playlistTitle, videos },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Playlist fetch failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Walks the ytInitialData JSON tree to find playlistVideoRenderer entries.
 * YouTube's internal JSON structure nests these under:
 * contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
 *   .sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
 *   .playlistVideoListRenderer.contents[]
 */
function extractVideos(data: Record<string, unknown>): PlaylistVideo[] {
  const videos: PlaylistVideo[] = [];

  // Recursive search for playlistVideoRenderer objects
  const queue: unknown[] = [data];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;

    const obj = node as Record<string, unknown>;

    if ("playlistVideoRenderer" in obj) {
      const renderer = obj.playlistVideoRenderer as Record<string, unknown>;
      const videoId = renderer.videoId as string | undefined;
      const titleRuns = (renderer.title as Record<string, unknown>)?.runs as
        | Array<{ text: string }>
        | undefined;
      const title = titleRuns?.map((r) => r.text).join("") ?? "";
      const lengthSeconds = renderer.lengthSeconds as string | undefined;
      const thumbails = (renderer.thumbnail as Record<string, unknown>)
        ?.thumbnails as Array<{ url: string }> | undefined;

      if (videoId && title) {
        videos.push({
          videoId,
          title,
          duration: lengthSeconds ? parseInt(lengthSeconds, 10) : null,
          thumbnail: thumbails?.[0]?.url ?? "",
        });
      }
      continue; // don't recurse deeper into this renderer
    }

    // Recurse into arrays and objects
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        queue.push(...value);
      } else if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return videos;
}
