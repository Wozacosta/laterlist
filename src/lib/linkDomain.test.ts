import { describe, expect, it } from "vitest";
import type { Item } from "@/db";
import { itemSource, linkDomain } from "./linkDomain";

const item = (url: string, category: Item["category"] = "article") => ({ url, category }) as Item;

describe("linkDomain", () => {
  it("strips www and the path", () => {
    expect(linkDomain("https://www.sharpe.ai/learn/futures-basis-explained?x=1")).toBe("sharpe.ai");
  });

  it("keeps other subdomains", () => {
    expect(linkDomain("https://knotbin.leaflet.pub/3mn6slfoxp22q")).toBe("knotbin.leaflet.pub");
  });

  it("has nothing to show for a missing or broken link", () => {
    expect(linkDomain("")).toBeNull();
    expect(linkDomain("not a link")).toBeNull();
  });
});

describe("itemSource", () => {
  it("shows the site of an article", () => {
    expect(itemSource(item("https://hamel.dev/blog/posts/evals/"))).toBe("hamel.dev");
  });

  it("skips kinds whose badge already names the site", () => {
    expect(itemSource(item("https://www.youtube.com/watch?v=abc", "video"))).toBeNull();
    expect(itemSource(item("https://x.com/a/status/1"))).toBeNull();
  });

  it("prefers the channel on a YouTube item", () => {
    expect(itemSource({ ...item("https://www.youtube.com/watch?v=abc", "video"), author: "Fireship" })).toBe("Fireship");
  });

  it("shows other video sites", () => {
    expect(itemSource(item("https://vimeo.com/191817381", "video"))).toBe("vimeo.com");
  });
});
