const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchYouTubeMetadata(url: string): Promise<{
  title: string;
  thumbnail: string;
  duration: number | null;
  description: string;
}> {
  // oEmbed for title + thumbnail
  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { headers: { "User-Agent": BROWSER_UA } }
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
        { headers: { "User-Agent": BROWSER_UA } }
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
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) {
    throw new Error(`Article fetch failed: ${res.status}`);
  }
  const html = await res.text();

  // Extract OG / fallback meta
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?? url;

  const ogImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    ?? null;

  const ogDescription =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
    ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? "";

  // Strip HTML and count words for read time
  const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainText.split(" ").filter(Boolean).length;
  const duration = Math.round((wordCount / 200) * 60); // seconds

  return {
    title: ogTitle.trim(),
    thumbnail: ogImage,
    duration,
    description: ogDescription.trim(),
  };
}
