// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { checkLink } from "./checkLink";
import { safeFetch } from "@/app/api/enrich/safeFetch";

vi.mock("@/app/api/enrich/safeFetch", () => ({ safeFetch: vi.fn() }));

function responds(status: number, url: string) {
  const res = new Response(null, { status });
  Object.defineProperty(res, "url", { value: url });
  vi.mocked(safeFetch).mockResolvedValueOnce(res);
}

describe("checkLink", () => {
  it("passes a live page", async () => {
    responds(200, "https://example.com/a");

    await expect(checkLink("https://example.com/a")).resolves.toBeNull();
  });

  it.each([404, 410])("flags a %i", async (status) => {
    responds(status, "https://example.com/a");

    await expect(checkLink("https://example.com/a")).resolves.toContain(String(status));
  });

  it("flags a page that redirects to the home page", async () => {
    responds(200, "https://example.com/");

    await expect(checkLink("https://example.com/gone")).resolves.toContain("home page");
  });

  it("allows a link that is the home page", async () => {
    responds(200, "https://example.com/");

    await expect(checkLink("https://example.com/")).resolves.toBeNull();
  });

  it("passes sites that refuse bots", async () => {
    responds(403, "https://example.com/a");

    await expect(checkLink("https://example.com/a")).resolves.toBeNull();
  });

  it("flags a link that can't be reached or isn't allowed", async () => {
    vi.mocked(safeFetch).mockRejectedValueOnce(new Error("blocked"));

    await expect(checkLink("http://127.0.0.1/")).resolves.toContain("couldn't be reached");
  });
});
