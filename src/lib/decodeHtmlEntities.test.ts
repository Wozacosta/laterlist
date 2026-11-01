import { describe, it, expect } from "vitest";
import { decodeHtmlEntities } from "./decodeHtmlEntities";

describe("decodeHtmlEntities", () => {
  it.each([
    ["Git &amp; SQLite", "Git & SQLite"],
    ["I&#x27;m addicted", "I'm addicted"],
    ["Don&#39;t panic", "Don't panic"],
    ["Language Log &raquo; Chinese", "Language Log » Chinese"],
    ["a &LT; b", "a < b"],
    ["&#x1F600;", "😀"],
  ])("decodes %s", (input, output) => {
    expect(decodeHtmlEntities(input)).toBe(output);
  });

  it("leaves unknown or invalid entities and plain text alone", () => {
    expect(decodeHtmlEntities("&unknown; R&D &#x110000;")).toBe("&unknown; R&D &#x110000;");
  });

  it("only decodes once", () => {
    expect(decodeHtmlEntities("&amp;#39;")).toBe("&#39;");
  });
});
