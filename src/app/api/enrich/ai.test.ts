import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ai and @ai-sdk/anthropic modules before importing the function
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

import { generateObject } from "ai";
import { inferCategoryAndTags } from "./ai";

beforeEach(() => {
  vi.mocked(generateObject).mockClear();
});

describe("inferCategoryAndTags", () => {
  it("returns category and lowercase tags from generateObject response", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { category: "video", tags: ["Rust", "Systems"] },
    } as never);

    const result = await inferCategoryAndTags("Intro to Rust", "Learn systems programming");
    expect(result.category).toBe("video");
    expect(result.tags).toEqual(["rust", "systems"]);
  });

  it("passes title and description in the prompt", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { category: "article", tags: ["crypto"] },
    } as never);

    await inferCategoryAndTags("Bitcoin deep dive", "All about crypto");

    const call = vi.mocked(generateObject).mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("Bitcoin deep dive");
    expect(call.prompt).toContain("All about crypto");
  });
});
