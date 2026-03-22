import { type NextRequest } from "next/server";
import { generateApiKey, listApiKeys, revokeApiKey } from "@/lib/server/apiKeys";

/**
 * GET /api/auth/keys
 * Lists all API keys (without actual key values — only prefix shown).
 * No auth required — this endpoint is always accessible so users can
 * manage keys even when locked out.
 */
export async function GET() {
  return Response.json(listApiKeys());
}

/**
 * POST /api/auth/keys
 * Body: { name?: string }
 * Generates a new API key. The full key is returned ONLY in this response.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";
    const result = generateApiKey(name);

    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * DELETE /api/auth/keys
 * Body: { id: string }
 * Revokes an API key by ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const revoked = revokeApiKey(id);
    if (!revoked) {
      return Response.json({ error: "Key not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
