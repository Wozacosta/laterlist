import { NextResponse, type NextRequest } from "next/server";
import { suggestSlots } from "@/lib/server/calendarSlots";

/**
 * GET /api/calendar/suggestions — Suggest learning time slots
 *
 * Query params:
 *   ?goal=30      — Daily learning goal in minutes (default: 30)
 *   ?date=...     — Target date ISO string (default: today)
 *   ?startHour=8  — Earliest preferred hour (default: 8)
 *   ?endHour=21   — Latest preferred hour (default: 21)
 *
 * Returns suggested time slots based on calendar free time and daily goal.
 * Works with Google Calendar, Proton Calendar, or locally (no calendar).
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const goal = parseInt(url.searchParams.get("goal") ?? "30", 10);
    const date = url.searchParams.get("date") ?? undefined;
    const startHour = parseInt(url.searchParams.get("startHour") ?? "8", 10);
    const endHour = parseInt(url.searchParams.get("endHour") ?? "21", 10);

    const result = await suggestSlots(goal, date, startHour, endHour);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to suggest slots";
    return NextResponse.json({ error: message, slots: [] }, { status: 500 });
  }
}
