import { describe, it, expect } from "vitest";
import { linkKey } from "./linkKey";

describe("linkKey", () => {
  it("ignores tracking, www and a trailing slash", () => {
    expect(linkKey("https://www.example.com/post/?utm_source=x&utm_medium=ios")).toBe(
      linkKey("http://example.com/post")
    );
    expect(linkKey("https://x.com/burkov/status/123?s=46&t=abc")).toBe("x.com/burkov/status/123");
  });

  it("keeps what identifies the page", () => {
    expect(linkKey("https://example.com/a?id=1")).not.toBe(linkKey("https://example.com/a?id=2"));
    expect(linkKey("https://www.youtube.com/watch?v=abc&si=xyz&t=40")).toBe("youtube.com/watch?v=abc");
    expect(linkKey("https://www.youtube.com/watch?v=abc")).not.toBe(linkKey("https://www.youtube.com/watch?v=def"));
  });

  it("copes with something that isn't a link", () => {
    expect(linkKey(" not a link/ ")).toBe("not a link");
  });
});
