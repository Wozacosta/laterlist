import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
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

  if (expected && token && timingSafeEqual(digest(token), digest(expected))) {
    return null;
  }

  return Response.json(
    { error: "Invalid or missing token" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}
