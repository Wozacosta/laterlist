// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { POST as inoreader } from "./inoreader/route";
import { captureItem } from "@/lib/server/captureItem";

vi.mock("@/lib/server/captureItem", () => ({ captureItem: vi.fn() }));

let ip = 0;

function post(path: string, body: unknown, auth = "Bearer right") {
  ip += 1;
  return new NextRequest(`https://www.laterlist.cc${path}`, {
    method: "POST",
    headers: { ...(auth && { authorization: auth }), "x-forwarded-for": `203.0.113.${ip}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("CAPTURE_TOKEN", "right");
  vi.mocked(captureItem).mockReset();
  vi.mocked(captureItem).mockResolvedValue({ id: "i", title: "T", duplicate: false });
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/capture", () => {
  it("refuses a wrong token before doing anything", async () => {
    const res = await POST(post("/api/capture", { url: "https://example.com" }, "Bearer wrong"));

    expect(res.status).toBe(401);
    expect(captureItem).not.toHaveBeenCalled();
  });

  it("refuses everyone when no token is configured", async () => {
    vi.stubEnv("CAPTURE_TOKEN", "");

    expect((await POST(post("/api/capture", { url: "https://example.com" }))).status).toBe(401);
  });

  it("saves a link", async () => {
    const res = await POST(post("/api/capture", { url: "https://example.com", notes: "hm" }));

    expect(res.status).toBe(201);
    expect(captureItem).toHaveBeenCalledWith({ url: "https://example.com", title: undefined, notes: "hm" });
  });

  it("refuses anything that isn't a web link", async () => {
    for (const url of ["ftp://example.com", "javascript:alert(1)", 5, undefined]) {
      expect((await POST(post("/api/capture", { url }))).status).toBe(400);
    }
    expect(captureItem).not.toHaveBeenCalled();
  });
});

describe("POST /api/capture/inoreader", () => {
  const article = { title: "Post", canonical: [{ href: "https://example.com/post" }] };

  it("takes the token from the address, since webhooks can't set headers", async () => {
    const res = await inoreader(post("/api/capture/inoreader?token=right", { items: [article] }, ""));

    expect(await res.json()).toEqual({ added: 1, skipped: 0 });
    expect(captureItem).toHaveBeenCalledWith({ url: "https://example.com/post", title: "Post" });
  });

  it("refuses a wrong token in the address", async () => {
    const res = await inoreader(post("/api/capture/inoreader?token=wrong", { items: [article] }, ""));

    expect(res.status).toBe(401);
  });

  it("counts repeats and articles with no link as skipped", async () => {
    vi.mocked(captureItem).mockResolvedValueOnce({ id: "i", title: "T", duplicate: true });

    const res = await inoreader(post("/api/capture/inoreader", { items: [article, { title: "No link" }] }));

    expect(await res.json()).toEqual({ added: 0, skipped: 2 });
  });

  it("accepts a single article body", async () => {
    const res = await inoreader(post("/api/capture/inoreader", article));

    expect((await res.json()).added).toBe(1);
  });
});
