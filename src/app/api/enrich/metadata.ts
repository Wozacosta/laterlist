import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { readCapped, safeFetch } from "./safeFetch";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Reads a meta tag's content, whichever order its attributes come in. */
function metaContent(html: string, attribute: string, name: string): string | undefined {
  const tag = html.match(new RegExp(`<meta[^>]+${attribute}=["']${name}["'][^>]*>`, "i"))?.[0];
  const match = tag?.match(/\scontent=(?:"([^"]*)"|'([^']*)')/i);
  return match?.[1] ?? match?.[2];
}

export async function fetchYouTubeMetadata(url: string): Promise<{
  title: string;
  thumbnail: string;
  duration: number | null;
  description: string;
}> {
  // oEmbed for title + thumbnail
  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { headers: { "User-Agent": BROWSER_UA }, cache: "no-store" }
  );
  if (!oembedRes.ok) {
    throw new Error(`YouTube oEmbed failed: ${oembedRes.status}`);
  }
  const oembed = await oembedRes.json();
  const title: string = oembed.title ?? "";
  const thumbnail: string = oembed.thumbnail_url ?? "";

  // Extract video ID for duration
  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  let duration: number | null = null;

  if (videoIdMatch) {
    try {
      const watchRes = await fetch(
        `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
        { headers: { "User-Agent": BROWSER_UA }, cache: "no-store" }
      );
      if (watchRes.ok) {
        const html = await watchRes.text();
        const durMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (durMatch) {
          duration = parseInt(durMatch[1], 10);
        }
      }
    } catch {
      // duration stays null — acceptable per spec
    }
  }

  return { title, thumbnail, duration, description: "" };
}

export async function fetchArticleMetadata(url: string): Promise<{
  title: string;
  thumbnail: string | null;
  duration: number;
  description: string;
}> {
  const res = await safeFetch(url, { "User-Agent": BROWSER_UA });
  if (!res.ok) {
    throw new Error(`Article fetch failed: ${res.status}`);
  }
  const html = await readCapped(res);

  const title =
    metaContent(html, "property", "og:title") ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    url;
  const thumbnail = metaContent(html, "property", "og:image") ?? null;
  const description =
    metaContent(html, "property", "og:description") ??
    metaContent(html, "name", "description") ??
    "";

  // Scripts can hold far more words than the page itself, so only count what's readable.
  const plainText = html
    .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText.split(" ").filter(Boolean).length;
  const duration = Math.round((wordCount / 200) * 60); // seconds

  return {
    title: decodeHtmlEntities(title.trim()),
    thumbnail,
    duration,
    description: decodeHtmlEntities(description.trim()),
  };
}
