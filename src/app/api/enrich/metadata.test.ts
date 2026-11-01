import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchArticleMetadata, fetchTweetMetadata, fetchYouTubeMetadata } from "./metadata";

vi.mock("node:dns/promises", () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  return { default: { lookup }, lookup };
});

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

describe("fetchTweetMetadata", () => {
  const oembed = (html: string) => ({
    ok: true,
    json: async () => ({ author_name: "BURKOV", html }),
  });

  it("uses the tweet as title and text, without its media link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          oembed(
            `<blockquote><p lang="en">Send the prompt &quot;twice&quot;<br>for #better results <a href="https://t.co/a">pic.twitter.com/a</a></p>&mdash; BURKOV</blockquote>`
          )
        )
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<meta property="og:image" content="https://pbs.twimg.com/media/a.jpg">`,
        })
    );

    const result = await fetchTweetMetadata("https://x.com/burkov/status/1");

    expect(result).toEqual({
      title: 'BURKOV: Send the prompt "twice" for #better results',
      thumbnail: "https://pbs.twimg.com/media/a.jpg",
      duration: null,
      description: 'Send the prompt "twice" for #better results',
    });
  });

  it("cuts a long tweet down for the title only", async () => {
    const text = Array(40).fill("word").join(" ");
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(oembed(`<p>${text}</p>`))
        .mockResolvedValueOnce({ ok: false, status: 403 })
    );

    const result = await fetchTweetMetadata("https://x.com/burkov/status/1");

    expect(result.title.length).toBeLessThan(115);
    expect(result.title.endsWith("…")).toBe(true);
    expect(result.description).toBe(text);
    expect(result.thumbnail).toBeNull();
  });

  it("names the author when a post has no text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(oembed(`<p><a href="https://t.co/a">pic.twitter.com/a</a></p>`))
        .mockResolvedValueOnce({ ok: false, status: 403 })
    );

    expect((await fetchTweetMetadata("https://x.com/burkov/status/1")).title).toBe("Post by BURKOV");
  });

  it("throws when oEmbed fails, so the link stays as it was pasted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));

    await expect(fetchTweetMetadata("https://x.com/burkov/status/1")).rejects.toThrow(
      "Tweet oEmbed failed"
    );
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

  it("keeps apostrophes and decodes entities in titles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<meta content="Don't panic &amp; carry on" property="og:title"><meta name="description" content='It&#x27;s "fine"'>`,
      })
    );

    const result = await fetchArticleMetadata("https://example.com/a");

    expect(result.title).toBe("Don't panic & carry on");
    expect(result.description).toBe(`It's "fine"`);
  });

  it("turns a relative image into a full link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => `<meta property="og:image" content="/images/card.png">`,
      })
    );

    const result = await fetchArticleMetadata("https://example.com/blog/post");

    expect(result.thumbnail).toBe("https://example.com/images/card.png");
  });

  it("decodes entities in an image link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => `<meta property="og:image" content="https://pbs.twimg.com/a?format=webp&amp;name=large">`,
      })
    );

    const result = await fetchArticleMetadata("https://x.com/a/status/1");

    expect(result.thumbnail).toBe("https://pbs.twimg.com/a?format=webp&name=large");
  });

  it("ignores an image link that can't be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => `<title>Still fine</title><meta property="og:image" content="http://">`,
      })
    );

    const result = await fetchArticleMetadata("https://example.com/post");

    expect(result.title).toBe("Still fine");
    expect(result.thumbnail).toBeNull();
  });

  it("falls back to the title tag, then the link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, text: async () => "<title>Git &amp; SQLite</title>" })
        .mockResolvedValueOnce({ ok: true, text: async () => "<p>no title</p>" })
    );

    expect((await fetchArticleMetadata("https://example.com/a")).title).toBe("Git & SQLite");
    expect((await fetchArticleMetadata("https://example.com/b")).title).toBe("https://example.com/b");
  });

  it("doesn't count scripts or styles as reading time", async () => {
    const code = Array(100_000).fill("token").join(" ");
    const words = Array(200).fill("word").join(" ");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<head><title>T</title></head><body><script type="module">${code}</script><style>${code}</style><p>${words}</p></body>`,
      })
    );

    const result = await fetchArticleMetadata("https://example.com/a");

    expect(result.duration).toBe(60);
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
