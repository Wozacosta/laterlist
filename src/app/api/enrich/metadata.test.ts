import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchYouTubeMetadata, fetchArticleMetadata } from "./metadata";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchYouTubeMetadata", () => {
  it("returns title and thumbnail from oEmbed, and duration from page HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            title: "Rick Astley - Never Gonna Give You Up",
            thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<html>"lengthSeconds":"212"</html>`,
        })
    );

    const result = await fetchYouTubeMetadata(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(result.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(result.thumbnail).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
    expect(result.duration).toBe(212);
  });

  it("returns null duration when lengthSeconds regex does not match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ title: "Video", thumbnail_url: "https://thumb.jpg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<html>no duration here</html>`,
        })
    );

    const result = await fetchYouTubeMetadata(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(result.duration).toBeNull();
  });

  it("throws when oEmbed request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    );

    await expect(
      fetchYouTubeMetadata("https://www.youtube.com/watch?v=bad")
    ).rejects.toThrow("YouTube oEmbed failed");
  });
});

describe("fetchArticleMetadata", () => {
  it("extracts og:title, og:image, and computes duration from word count", async () => {
    const words = Array(400).fill("word").join(" ");
    const html = `
      <html>
        <head>
          <meta property="og:title" content="My Article" />
          <meta property="og:image" content="https://img.example.com/img.jpg" />
          <meta property="og:description" content="A great read" />
        </head>
        <body>${words}</body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, text: async () => html })
    );

    const result = await fetchArticleMetadata("https://example.com/article");
    expect(result.title).toBe("My Article");
    expect(result.thumbnail).toBe("https://img.example.com/img.jpg");
    expect(result.description).toBe("A great read");
    // 400 words / 200 wpm * 60s = 120s
    expect(result.duration).toBeGreaterThan(0);
  });

  it("throws when article fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 403 })
    );

    await expect(
      fetchArticleMetadata("https://blocked.example.com")
    ).rejects.toThrow("Article fetch failed");
  });
});
