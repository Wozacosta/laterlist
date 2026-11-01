import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;

const INTERNAL_IPV4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const INTERNAL_IPV6: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const internal = new BlockList();
for (const [network, prefix] of INTERNAL_IPV4) internal.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of INTERNAL_IPV6) internal.addSubnet(network, prefix, "ipv6");

/** Thrown when a URL, or a redirect it leads to, isn't a public web address. */
export class BlockedUrlError extends Error {}

async function assertPublic(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new BlockedUrlError(`Blocked protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });
  for (const { address, family } of addresses) {
    if (internal.check(address, family === 6 ? "ipv6" : "ipv4")) {
      throw new BlockedUrlError(`Blocked internal address: ${hostname}`);
    }
  }
}

/**
 * Fetches a user-supplied URL from the server. Every redirect hop is checked,
 * because a public page can redirect to an internal address.
 *
 * The check happens before the request, so a host that changes its DNS answer
 * between the two could still get through.
 */
export async function safeFetch(url: string, headers: HeadersInit): Promise<Response> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = new URL(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(current);

    const res = await fetch(current.href, {
      headers,
      signal,
      redirect: "manual",
      cache: "no-store",
    });

    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    current = new URL(location, current);
  }

  throw new Error("Too many redirects");
}

/** Reads a response body up to MAX_BYTES. Metadata sits near the top of a page. */
export async function readCapped(res: Response): Promise<string> {
  if (!res.body) return res.text();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;

  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.length;
    text += decoder.decode(value, { stream: true });
  }

  await reader.cancel();
  return text + decoder.decode();
}
