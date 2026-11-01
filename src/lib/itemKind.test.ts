import { describe, it, expect } from "vitest";
import { isTweetUrl, itemKind } from "./itemKind";

describe("itemKind", () => {
  it("trusts the link over the saved category", () => {
    expect(itemKind({ url: "https://www.youtube.com/watch?v=a", category: "article" })).toBe("YouTube");
    expect(itemKind({ url: "https://youtu.be/a", category: "podcast" })).toBe("YouTube");
    expect(itemKind({ url: "https://x.com/burkov/status/123?s=46", category: "other" })).toBe("Tweet");
  });

  it("isn't fooled by a link that only mentions YouTube", () => {
    expect(itemKind({ url: "https://blog.example.com/youtube.com/", category: "article" })).toBe("Article");
    expect(itemKind({ url: "https://notyoutube.com/a", category: "article" })).toBe("Article");
  });

  it("falls back to the category", () => {
    expect(itemKind({ url: "https://example.com/a", category: "article" })).toBe("Article");
    expect(itemKind({ url: "", category: "action" })).toBe("Action");
  });

  it("calls an uncategorized item a link or a note", () => {
    expect(itemKind({ url: "https://example.com/a", category: "other" })).toBe("Link");
    expect(itemKind({ url: "", category: "other" })).toBe("Note");
  });
});

describe("isTweetUrl", () => {
  it("matches posts on x.com and twitter.com, with or without tracking", () => {
    expect(isTweetUrl("https://x.com/burkov/status/2023822767284490263?s=46&t=abc")).toBe(true);
    expect(isTweetUrl("https://mobile.twitter.com/burkov/status/123")).toBe(true);
  });

  it("leaves profiles and lookalike sites alone", () => {
    expect(isTweetUrl("https://x.com/burkov")).toBe(false);
    expect(isTweetUrl("https://netflix.com/a/status/123")).toBe(false);
  });
});
