import type { Category, Item } from "@/db";

export type ItemKind =
  | "YouTube"
  | "Tweet"
  | "Video"
  | "Article"
  | "Paper"
  | "Repo"
  | "Podcast"
  | "Doc"
  | "Action"
  | "Link"
  | "Note";

const CATEGORY_KINDS: Record<Exclude<Category, "other">, ItemKind> = {
  video: "Video",
  article: "Article",
  paper: "Paper",
  repo: "Repo",
  podcast: "Podcast",
  doc: "Doc",
  action: "Action",
};

const YOUTUBE_URL = /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i;
const TWEET_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/i;

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL.test(url);
}

export function isTweetUrl(url: string): boolean {
  return TWEET_URL.test(url);
}

/** The link decides first: most saved YouTube videos were categorized as articles. */
export function itemKind({ url, category }: Pick<Item, "url" | "category">): ItemKind {
  if (isYouTubeUrl(url)) return "YouTube";
  if (isTweetUrl(url)) return "Tweet";
  if (category !== "other") return CATEGORY_KINDS[category];
  return url ? "Link" : "Note";
}
