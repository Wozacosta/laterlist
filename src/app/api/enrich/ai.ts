import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Category } from "@/db";

const schema = z.object({
  category: z.enum([
    "video",
    "article",
    "paper",
    "repo",
    "podcast",
    "doc",
    "other",
  ]),
  tags: z.array(z.string()).min(1).max(5),
});

export async function inferCategoryAndTags(
  title: string,
  description: string
): Promise<{ category: Category; tags: string[] }> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Classify this content. Title: ${title}. Description: ${description}. Return a category and 1-5 concise lowercase tags (topic keywords like 'rust', 'crypto', 'machine-learning').`,
  });

  return {
    category: object.category as Category,
    tags: object.tags.map((t) => t.toLowerCase()),
  };
}
