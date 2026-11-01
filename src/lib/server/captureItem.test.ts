// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureItem } from "./captureItem";
import { readRows, writeRows } from "./dexieCloud";
import { lookUpLink } from "./lookUpLink";

vi.mock("./dexieCloud", () => ({ readRows: vi.fn(), writeRows: vi.fn() }));
vi.mock("./lookUpLink", () => ({ lookUpLink: vi.fn() }));

const page = { title: "A page", thumbnail: "https://example.com/a.png", duration: 60, summary: undefined, category: "article" as const, tags: ["a"] };

beforeEach(() => {
  vi.mocked(readRows).mockReset();
  vi.mocked(readRows).mockResolvedValue([]);
  vi.mocked(writeRows).mockReset();
  vi.mocked(lookUpLink).mockReset();
  vi.mocked(lookUpLink).mockResolvedValue(page);
});

describe("captureItem", () => {
  it("saves a link with what the page says", async () => {
    const result = await captureItem({ url: "https://example.com/a" });

    expect(result).toMatchObject({ title: "A page", duplicate: false });
    expect(vi.mocked(writeRows).mock.calls[0][1][0]).toMatchObject({
      url: "https://example.com/a",
      title: "A page",
      category: "article",
      thumbnail: "https://example.com/a.png",
      duration: 60,
      status: "unread",
    });
  });

  it("leaves a repeat alone, even with different tracking", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([{ id: "old", title: "Old", url: "https://example.com/a?utm_source=x" }]);

    expect(await captureItem({ url: "https://www.example.com/a/" })).toEqual({ id: "old", title: "Old", duplicate: true });
    expect(writeRows).not.toHaveBeenCalled();
    expect(lookUpLink).not.toHaveBeenCalled();
  });

  it("doesn't bring back something in the Trash", async () => {
    vi.mocked(readRows).mockResolvedValueOnce([{ id: "gone", title: "Gone", url: "https://example.com/a", deletedAt: "2026-11-01" }]);

    expect((await captureItem({ url: "https://example.com/a" })).duplicate).toBe(true);
  });

  it("still saves the link when the page won't load", async () => {
    vi.mocked(lookUpLink).mockRejectedValueOnce(new Error("403"));

    const result = await captureItem({ url: "https://example.com/blocked" });

    expect(result).toMatchObject({ title: "https://example.com/blocked", duplicate: false });
    expect(writeRows).toHaveBeenCalledOnce();
  });

  it("prefers a title it's given, and keeps a note", async () => {
    await captureItem({ url: "https://example.com/a", title: "From Inoreader", notes: "read this" });

    expect(vi.mocked(writeRows).mock.calls[0][1][0]).toMatchObject({ title: "From Inoreader", notes: "read this" });
  });
});
