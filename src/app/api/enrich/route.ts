import { fetchYouTubeMetadata, fetchArticleMetadata } from "./metadata";
import { inferCategoryAndTags } from "./ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return Response.json({ error: "Missing or invalid url" }, { status: 400 });
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

    return Response.json({
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      category,
      tags,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
