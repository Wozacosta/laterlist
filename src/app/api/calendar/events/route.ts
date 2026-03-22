import { NextResponse } from "next/server";
import {
  pushEvent,
  buildEventFromItem,
  getConnectedProvider,
} from "@/lib/server/calendarEvents";
import { addEventMapping } from "@/lib/server/calendarSync";

/**
 * GET /api/calendar/events — Check which calendar provider is connected
 */
export async function GET() {
  const provider = await getConnectedProvider();
  return NextResponse.json({ provider, connected: provider !== null });
}

/**
 * POST /api/calendar/events — Push a subtask as a time-blocked calendar event
 *
 * Body: {
 *   itemId?: string,        // Push an existing item by ID
 *   title?: string,         // Or provide event details directly
 *   url?: string,
 *   duration?: number,      // seconds
 *   topicName?: string,
 *   startTime?: string,     // ISO datetime (defaults to next hour)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, title, url, duration, topicName, startTime } = body as {
      itemId?: string;
      title?: string;
      url?: string;
      duration?: number;
      topicName?: string;
      startTime?: string;
    };

    // Build the event from provided fields
    let event;
    if (title) {
      event = buildEventFromItem(
        { title, url, duration, topicName },
        startTime
      );
    } else {
      return NextResponse.json(
        { ok: false, error: "Provide either itemId or title" },
        { status: 400 }
      );
    }

    const result = await pushEvent(event);

    if (!result.ok) {
      return NextResponse.json(result, { status: 502 });
    }

    // Track the event mapping for bidirectional sync (LT-64)
    if (result.eventId && itemId) {
      await addEventMapping(itemId, result.eventId, result.provider);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to push event";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
