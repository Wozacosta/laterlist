import { NextResponse } from "next/server";
import {
  syncCalendarCompletionsToLaterlist,
  syncItemCompletionToCalendar,
  getSyncStatus,
} from "@/lib/server/calendarSync";

/**
 * GET /api/calendar/sync — Get sync status
 */
export async function GET() {
  try {
    const status = getSyncStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/calendar/sync — Trigger bidirectional sync
 *
 * Body:
 *   { action: "pull" }           — poll calendar for completed events → mark items done
 *   { action: "push", itemId }   — item marked done → delete calendar event
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, itemId } = body as { action?: string; itemId?: string };

    if (action === "push" && itemId) {
      const result = await syncItemCompletionToCalendar(itemId);
      return NextResponse.json({ ok: true, action: "push", ...result });
    }

    if (action === "pull") {
      const result = await syncCalendarCompletionsToLaterlist();
      return NextResponse.json({ ok: true, action: "pull", ...result });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'pull' or 'push' with itemId." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
