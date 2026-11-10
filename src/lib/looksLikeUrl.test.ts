import { describe, it, expect } from "vitest";
import { looksLikeUrl, toUrl } from "./looksLikeUrl";

describe("looksLikeUrl", () => {
  it.each([
    "https://example.com",
    "http://localhost:3000/a",
    "example.com",
    "example.com/path",
    "www.example.com",
    "docs.python.org/3",
    "docs.python.org/3/library/",
    "  youtu.be/dQw4w9WgXcQ  ",
    "example.com?x=1",
  ])("treats %s as a link", (input) => {
    expect(looksLikeUrl(input)).toBe(true);
  });

  it.each([
    "Read the Rust book",
    "node.js",
    "notes.md",
    "Learn example.com basics",
    "v1.2",
    "",
  ])("treats %j as text", (input) => {
    expect(looksLikeUrl(input)).toBe(false);
  });
});

describe("toUrl", () => {
  it("adds https to a bare domain and leaves full links alone", () => {
    expect(toUrl(" example.com/a ")).toBe("https://example.com/a");
    expect(toUrl("http://example.com")).toBe("http://example.com");
  });
});
