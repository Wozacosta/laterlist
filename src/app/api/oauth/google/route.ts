import { type NextRequest } from "next/server";
import { requireOwner } from "@/lib/server/dexieAuth";
import { NextResponse } from "next/server";
import {
  getAuthUrl,
  getConnectionStatus,
  disconnect,
} from "@/lib/server/calendarOAuth";

/**
 * GET /api/oauth/google — Check Google Calendar connection status
 */
export async function GET(request: NextRequest) {
  const denied = await requireOwner(request);
  if (denied) return denied;
  try {
    const status = await getConnectionStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ connected: false, error: message });
  }
}

/**
 * POST /api/oauth/google — Start OAuth flow (returns auth URL)
 */
export async function POST(request: NextRequest) {
  const denied = await requireOwner(request);
  if (denied) return denied;
  try {
    const url = await getAuthUrl();
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/oauth/google — Disconnect Google Calendar
 */
export async function DELETE(request: NextRequest) {
  const denied = await requireOwner(request);
  if (denied) return denied;
  try {
    await disconnect();
    return NextResponse.json({ ok: true, disconnected: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
