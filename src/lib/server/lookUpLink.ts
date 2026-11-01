import { inferCategoryAndTags } from "@/app/api/enrich/ai";
import {
  fetchArticleMetadata,
  fetchTweetMetadata,
  fetchYouTubeMetadata,
} from "@/app/api/enrich/metadata";
import type { Category } from "@/db";
import { isTweetUrl, isYouTubeUrl } from "@/lib/itemKind";

/** Fetches what a link can tell us. Classification is a bonus, so it can't cost the title. */
export async function lookUpLink(url: string) {
  const isTweet = isTweetUrl(url);
  const metadata = isYouTubeUrl(url)
    ? await fetchYouTubeMetadata(url)
    : isTweet
      ? await fetchTweetMetadata(url)
      : await fetchArticleMetadata(url);

  const { category, tags } = await inferCategoryAndTags(metadata.title, metadata.description).catch(
    () => ({ category: "other" as Category, tags: [] as string[] })
  );

  return {
    title: metadata.title,
    thumbnail: metadata.thumbnail,
    duration: metadata.duration,
    summary: isTweet ? metadata.description : undefined,
    category,
    tags,
  };
}
