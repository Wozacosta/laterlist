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

const TWEET_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/i;
const TWEET_TITLE_LENGTH = 100;

export function isTweetUrl(url: string): boolean {
  return TWEET_URL.test(url);
}

/** A tweet has no title, so its first words stand in for one and the text becomes the summary. */
export async function fetchTweetMetadata(url: string): Promise<{
  title: string;
  thumbnail: string | null;
  duration: null;
  description: string;
}> {
  const res = await fetch(
    `https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=${encodeURIComponent(url)}`,
    { headers: { "User-Agent": BROWSER_UA }, cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Tweet oEmbed failed: ${res.status}`);
  }
  const oembed = await res.json();
  const author: string = oembed.author_name ?? "";
  const body: string = oembed.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const text = decodeHtmlEntities(
    body
      .replace(/<a\b[^>]*>(?:pic\.|https?:)[^<]*<\/a>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  const preview =
    text.length > TWEET_TITLE_LENGTH ? `${text.slice(0, TWEET_TITLE_LENGTH).trimEnd()}…` : text;
  // oEmbed has no picture, so the page is a best effort.
  const thumbnail = await fetchArticleMetadata(url).then(
    (page) => page.thumbnail,
    () => null
  );

  return {
    title: preview ? `${author}: ${preview}` : `Post by ${author}`,
    thumbnail,
    duration: null,
    description: text,
  };
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
  const image = decodeHtmlEntities(metaContent(html, "property", "og:image") ?? "");
  const base = res.url || url;
  const thumbnail = image && URL.canParse(image, base) ? new URL(image, base).href : null;
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
