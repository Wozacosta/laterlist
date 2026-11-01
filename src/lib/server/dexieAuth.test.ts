// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireDexieUser, requireOwner } from "./dexieAuth";

function request(headers: Record<string, string> = {}) {
  return new NextRequest("https://www.laterlist.cc/api/enrich", { method: "POST", headers });
}

const signedIn = { authorization: "Bearer good-token", origin: "https://www.laterlist.cc" };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEXIE_CLOUD_URL", "https://db.dexie.cloud");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireDexieUser", () => {
  it("refuses a request with no token, without calling Dexie Cloud", async () => {
    const denied = await requireDexieUser(request());

    expect(denied?.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts a token Dexie Cloud says is valid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ valid: true, claims: { sub: "me" } }));

    await expect(requireDexieUser(request(signedIn))).resolves.toBeNull();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://db.dexie.cloud/token/validate");
    expect(init?.headers).toEqual({
      Authorization: "Bearer good-token",
      Origin: "https://www.laterlist.cc",
    });
  });

  it("refuses a token Dexie Cloud rejects", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("Token verification failed: jwt malformed", { status: 401 })
    );

    const denied = await requireDexieUser(request(signedIn));

    expect(denied?.status).toBe(401);
  });

  it("refuses an answer that isn't a clear yes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ valid: false }));

    const denied = await requireDexieUser(request(signedIn));

    expect(denied?.status).toBe(401);
  });

  it("fails closed when Dexie Cloud is down", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 503 }));
    expect((await requireDexieUser(request(signedIn)))?.status).toBe(503);

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    expect((await requireDexieUser(request(signedIn)))?.status).toBe(503);
  });

  it("fails closed when no database is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEXIE_CLOUD_URL", "");

    const denied = await requireDexieUser(request(signedIn));

    expect(denied?.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("requireOwner", () => {
  beforeEach(() => {
    vi.stubEnv("MCP_USER_EMAIL", "Owner@Example.com");
  });

  it("accepts the owner, whatever the case of the address", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ valid: true, claims: { sub: "owner@example.com" } })
    );

    expect(await requireOwner(request(signedIn))).toBeNull();
  });

  it("refuses another signed-in user", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ valid: true, claims: { sub: "someone@example.com" } })
    );

    expect((await requireOwner(request(signedIn)))?.status).toBe(403);
  });

  it("refuses a request with no token", async () => {
    expect((await requireOwner(request()))?.status).toBe(401);
  });

  it("refuses everyone when no owner is configured", async () => {
    vi.stubEnv("MCP_USER_EMAIL", "");

    expect((await requireOwner(request(signedIn)))?.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});
