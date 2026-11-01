// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { lookup } from "node:dns/promises";
import { POST } from "./route";
import { inferCategoryAndTags } from "./ai";
import { requireDexieUser } from "@/lib/server/dexieAuth";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn();
  return { default: { lookup }, lookup };
});
vi.mock("./ai", () => ({ inferCategoryAndTags: vi.fn() }));
vi.mock("@/lib/server/dexieAuth", () => ({ requireDexieUser: vi.fn() }));

let nextIp = 0;

function enrich(url: string) {
  nextIp += 1;
  return POST(
    new NextRequest("https://www.laterlist.cc/api/enrich", {
      method: "POST",
      headers: { "x-real-ip": `198.51.100.${nextIp}` },
      body: JSON.stringify({ url }),
    })
  );
}

beforeEach(() => {
  vi.mocked(requireDexieUser).mockReset();
  vi.mocked(requireDexieUser).mockResolvedValue(null);
  vi.mocked(inferCategoryAndTags).mockReset();
  vi.mocked(lookup).mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

describe("POST /api/enrich", () => {
  it("does no fetching or AI work without a valid sign in", async () => {
    vi.mocked(requireDexieUser).mockResolvedValueOnce(
      Response.json({ error: "Sign in to use this" }, { status: 401 })
    );

    const res = await enrich("https://example.com");

    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    expect(inferCategoryAndTags).not.toHaveBeenCalled();
  });

  it("refuses an internal address without fetching it", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "169.254.169.254", family: 4 },
    ] as never);

    const res = await enrich("http://metadata.internal/latest/");

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(inferCategoryAndTags).not.toHaveBeenCalled();
  });

  it("enriches a public page for a signed-in user", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as never);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<html><title>Hello</title></html>")
    );
    vi.mocked(inferCategoryAndTags).mockResolvedValueOnce({
      category: "article",
      tags: ["hello"],
    } as never);

    const res = await enrich("https://example.com");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      title: "Hello",
      category: "article",
      tags: ["hello"],
    });
  });
});
