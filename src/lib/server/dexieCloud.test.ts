// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearTokenCache, readRows, writeRows } from "./dexieCloud";

function token() {
  return Response.json({ type: "tokens", accessToken: "user-token" });
}

beforeEach(() => {
  clearTokenCache();
  vi.stubEnv("NEXT_PUBLIC_DEXIE_CLOUD_URL", "https://db.dexie.cloud");
  vi.stubEnv("DEXIE_CLOUD_CLIENT_ID", "client-id");
  vi.stubEnv("DEXIE_CLOUD_CLIENT_SECRET", "client-secret");
  vi.stubEnv("MCP_USER_EMAIL", "me@example.com");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("dexieCloud", () => {
  it("reads rows as the configured user, not as the whole database", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(Response.json([{ id: "itm1" }]));

    await expect(readRows("items")).resolves.toEqual([{ id: "itm1" }]);

    const [tokenUrl, tokenInit] = vi.mocked(fetch).mock.calls[0];
    expect(tokenUrl).toBe("https://db.dexie.cloud/token");
    expect(JSON.parse(tokenInit?.body as string)).toMatchObject({
      scopes: ["ACCESS_DB", "IMPERSONATE"],
      claims: { sub: "me@example.com", email: "me@example.com" },
    });

    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://db.dexie.cloud/my/items");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer user-token" });
  });

  it("writes rows to the user's own endpoint", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await writeRows("items", [{ id: "itm1" }]);

    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://db.dexie.cloud/my/items");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('[{"id":"itm1","owner":"me@example.com"}]');
  });

  it("reuses a token until it's near expiry", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).endsWith("/token") ? token() : Response.json([])
    );

    await readRows("items");
    await readRows("topics");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(1);

    vi.advanceTimersByTime(51 * 60_000);
    await readRows("items");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(2);
  });

  it("doesn't cache a failed token request or leak response bodies", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("secret detail", { status: 401 }));

    await expect(readRows("items")).rejects.toThrow("Dexie Cloud token request failed: 401");

    vi.mocked(fetch)
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(Response.json([]));
    await expect(readRows("items")).resolves.toEqual([]);
  });

  it("fails when access isn't configured", async () => {
    vi.stubEnv("DEXIE_CLOUD_CLIENT_SECRET", "");

    await expect(readRows("items")).rejects.toThrow("isn't configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});
