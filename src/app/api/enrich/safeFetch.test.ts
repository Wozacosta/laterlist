// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookup } from "node:dns/promises";
import { BlockedUrlError, readCapped, safeFetch } from "./safeFetch";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn();
  return { default: { lookup }, lookup };
});

const PUBLIC = [{ address: "93.184.216.34", family: 4 }];

function resolvesTo(...addresses: { address: string; family: number }[]) {
  vi.mocked(lookup).mockResolvedValueOnce(addresses as never);
}

function redirectTo(location: string) {
  return new Response(null, { status: 302, headers: { location } });
}

beforeEach(() => {
  vi.mocked(lookup).mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

describe("safeFetch", () => {
  it.each([
    ["loopback", "127.0.0.1", 4],
    ["private", "10.0.0.8", 4],
    ["private", "192.168.1.1", 4],
    ["cloud metadata", "169.254.169.254", 4],
    ["IPv6 loopback", "::1", 6],
    ["IPv6 private", "fd00::1", 6],
    ["IPv4 mapped in IPv6", "::ffff:127.0.0.1", 6],
  ])("blocks a host resolving to a %s address", async (_label, address, family) => {
    resolvesTo({ address, family });

    await expect(safeFetch("https://example.com", {})).rejects.toThrow(BlockedUrlError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks a host when any of its addresses is internal", async () => {
    resolvesTo(PUBLIC[0], { address: "10.0.0.8", family: 4 });

    await expect(safeFetch("https://example.com", {})).rejects.toThrow(BlockedUrlError);
  });

  it("blocks non-web protocols", async () => {
    await expect(safeFetch("file:///etc/passwd", {})).rejects.toThrow(BlockedUrlError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("fetches a public URL without following redirects by itself", async () => {
    resolvesTo(...PUBLIC);
    const page = new Response("hello");
    vi.mocked(fetch).mockResolvedValueOnce(page);

    await expect(safeFetch("https://example.com/a", {})).resolves.toBe(page);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/a",
      expect.objectContaining({ redirect: "manual" })
    );
  });

  it("checks each redirect, including relative ones", async () => {
    resolvesTo(...PUBLIC);
    resolvesTo(...PUBLIC);
    const page = new Response("hello");
    vi.mocked(fetch).mockResolvedValueOnce(redirectTo("/next")).mockResolvedValueOnce(page);

    await expect(safeFetch("https://example.com/a", {})).resolves.toBe(page);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe("https://example.com/next");
  });

  it("blocks a public page redirecting to an internal address", async () => {
    resolvesTo(...PUBLIC);
    resolvesTo({ address: "169.254.169.254", family: 4 });
    vi.mocked(fetch).mockResolvedValueOnce(redirectTo("http://metadata.internal/"));

    await expect(safeFetch("https://example.com", {})).rejects.toThrow(BlockedUrlError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up after too many redirects", async () => {
    vi.mocked(lookup).mockResolvedValue(PUBLIC as never);
    vi.mocked(fetch).mockImplementation(async () => redirectTo("/again"));

    await expect(safeFetch("https://example.com", {})).rejects.toThrow("Too many redirects");
    expect(fetch).toHaveBeenCalledTimes(6);
  });
});

describe("readCapped", () => {
  it("returns a whole small body", async () => {
    await expect(readCapped(new Response("hello"))).resolves.toBe("hello");
  });

  it("stops reading a huge body", async () => {
    const chunk = new Uint8Array(1_000_000).fill(97);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(chunk);
      },
    });

    const text = await readCapped(new Response(body));

    expect(text.length).toBe(2_000_000);
    expect(sent).toBeLessThan(5);
  });
});
