import { NextResponse } from "next/server";
import {
  connect,
  disconnect,
  getConnectionStatus,
} from "@/lib/server/protonCalendar";

/**
 * GET /api/calendar/proton — Check Proton Calendar connection status
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
 * POST /api/calendar/proton — Connect to Proton Calendar
 *
 * Body: { email: string, password: string, caldavUrl?: string }
 *
 * The password should be an app-specific password generated in
 * Proton Mail settings (Settings → All Settings → Security → App passwords).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, caldavUrl } = body as {
      email?: string;
      password?: string;
      caldavUrl?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await connect(email, password, caldavUrl);

    if (!result.ok) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar/proton — Disconnect from Proton Calendar
 */
export async function DELETE() {
  try {
    disconnect();
    return NextResponse.json({ ok: true, disconnected: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
