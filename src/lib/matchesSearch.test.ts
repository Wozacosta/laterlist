import { describe, it, expect } from "vitest";
import type { Item } from "@/db";
import { matchesSearch } from "./matchesSearch";

const item: Item = {
  id: "a",
  url: "https://example.com/queues",
  title: "Stop Relying on HTTP",
  category: "video",
  tags: ["backend", "messaging"],
  addedAt: "2026-11-01T00:00:00.000Z",
  sortOrder: 0,
  status: "unread",
  notes: "Good intro to retries",
  summary: "Why brokers beat direct calls",
  author: "ByteByteGo",
};

describe("matchesSearch", () => {
  it.each([
    ["the title", "relying"],
    ["a tag", "messaging"],
    ["a note", "retries"],
    ["the summary", "brokers"],
    ["the link", "example.com"],
    ["the channel", "bytebytego"],
    ["any case", "HTTP stop"],
    ["several fields at once", "backend retries"],
  ])("finds %s", (_label, query) => {
    expect(matchesSearch(item, query)).toBe(true);
  });

  it("needs every word to match", () => {
    expect(matchesSearch(item, "backend kubernetes")).toBe(false);
  });

  it("matches everything for an empty search", () => {
    expect(matchesSearch(item, "   ")).toBe(true);
  });

  it("copes with an item that has no optional text", () => {
    const bare = { ...item, notes: undefined, summary: undefined, tags: [] };

    expect(matchesSearch(bare, "relying")).toBe(true);
  });
});
