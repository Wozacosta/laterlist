import { NextResponse } from "next/server";
import {
  getAuthUrl,
  getConnectionStatus,
  disconnect,
} from "@/lib/server/calendarOAuth";

/**
 * GET /api/oauth/google — Check Google Calendar connection status
 */
export async function GET() {
  try {
    const status = getConnectionStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ connected: false, error: message });
  }
}

/**
 * POST /api/oauth/google — Start OAuth flow (returns auth URL)
 */
export async function POST() {
  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/oauth/google — Disconnect Google Calendar
 */
export async function DELETE() {
  try {
    await disconnect();
    return NextResponse.json({ ok: true, disconnected: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
