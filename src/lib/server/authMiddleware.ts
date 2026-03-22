import { type NextRequest } from "next/server";
import { validateApiKey, hasAnyKeys } from "./apiKeys";

/**
 * Validates API key authentication on a request.
 *
 * Auth model:
 * - If no API keys have been generated, all requests are allowed (open access).
 * - Once at least one key exists, all /api/ requests require a valid
 *   Authorization: Bearer <token> header.
 *
 * @returns null if authorized, or a Response (401/403) if not.
 */
export function requireAuth(request: NextRequest): Response | null {
  // If no keys exist, auth is disabled — open access mode
  if (!hasAnyKeys()) {
    return null;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return Response.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer <api-key>" },
      { status: 401 }
    );
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json(
      { error: "Invalid Authorization header format. Use: Bearer <api-key>" },
      { status: 401 }
    );
  }

  const token = match[1];
  if (!validateApiKey(token)) {
    return Response.json(
      { error: "Invalid or revoked API key" },
      { status: 403 }
    );
  }

  return null; // authorized
}
