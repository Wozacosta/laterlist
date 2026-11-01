import { type NextRequest } from "next/server";

const VALIDATE_TIMEOUT_MS = 5_000;

async function validate(
  request: NextRequest
): Promise<{ claims?: { sub?: string } } | Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return Response.json({ error: "Sign in to use this" }, { status: 401 });
  }

  const databaseUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL;
  if (!databaseUrl) {
    return Response.json({ error: "Sign in is unavailable" }, { status: 503 });
  }

  try {
    const res = await fetch(`${databaseUrl}/token/validate`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: request.headers.get("origin") ?? request.nextUrl.origin,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
    });

    if (res.status >= 500) {
      return Response.json({ error: "Sign in is unavailable" }, { status: 503 });
    }

    const data = res.ok ? await res.json() : null;
    if (data?.valid === true) return data;
  } catch {
    return Response.json({ error: "Sign in is unavailable" }, { status: 503 });
  }

  return Response.json({ error: "Invalid or expired sign in" }, { status: 401 });
}

/**
 * Checks that a browser request comes from a logged-in Dexie Cloud user.
 *
 * Dexie Cloud publishes no key to verify its tokens locally, so the token goes
 * to the database's documented /token/validate endpoint. Anything other than a
 * positive answer is refused.
 *
 * @returns null if authorized, or a Response (401/503) if not.
 */
export async function requireDexieUser(request: NextRequest): Promise<Response | null> {
  const result = await validate(request);
  return result instanceof Response ? result : null;
}

/**
 * Checks that a request comes from the site's owner. Sign up is open, so routes
 * that touch shared server state can't stop at "signed in".
 *
 * @returns null if authorized, or a Response (401/403/503) if not.
 */
export async function requireOwner(request: NextRequest): Promise<Response | null> {
  const owner = process.env.MCP_USER_EMAIL?.toLowerCase();
  if (!owner) {
    return Response.json({ error: "Sign in is unavailable" }, { status: 503 });
  }

  const result = await validate(request);
  if (result instanceof Response) return result;

  return result.claims?.sub?.toLowerCase() === owner
    ? null
    : Response.json({ error: "Not allowed" }, { status: 403 });
}
