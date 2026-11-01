import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function matches(token: string | null | undefined, expected: string | undefined): boolean {
  return Boolean(expected && token && timingSafeEqual(digest(token), digest(expected)));
}

/**
 * Checks the add-only token on a capture request. A webhook can't always set a
 * header, so the token may also come in the address.
 *
 * @returns null if authorized, or a 401 Response if not.
 */
export function requireCaptureToken(request: Request): Response | null {
  const header = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = header ?? new URL(request.url).searchParams.get("token");

  return matches(token, process.env.CAPTURE_TOKEN)
    ? null
    : Response.json({ error: "Invalid or missing token" }, { status: 401 });
}

/**
 * Checks the private token on an MCP request. With no MCP_TOKEN configured,
 * every request is refused.
 *
 * @returns null if authorized, or a 401 Response if not.
 */
export function requireMcpToken(request: Request): Response | null {
  const expected = process.env.MCP_TOKEN;
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (matches(token, expected)) return null;

  return Response.json(
    { error: "Invalid or missing token" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}
