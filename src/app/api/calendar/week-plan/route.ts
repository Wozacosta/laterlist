import { NextResponse, type NextRequest } from "next/server";
import { suggestSlots } from "@/lib/server/calendarSlots";
import { pushEvent } from "@/lib/server/calendarEvents";

export interface DayPlan {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  topicName: string;
  topicId: string;
  slot: { start: string; end: string; durationMinutes: number } | null;
}

/**
 * GET /api/calendar/week-plan — Generate a week learning plan
 *
 * Query params:
 *   ?goal=60           — Daily learning goal in minutes (default: 60)
 *   ?topics=id1,id2... — Topic IDs from study queue, ordered by urgency (required)
 *   ?names=a,b...      — Topic names matching the IDs
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const goal = parseInt(url.searchParams.get("goal") ?? "60", 10);
    const topicIds = (url.searchParams.get("topics") ?? "").split(",").filter(Boolean);
    const topicNames = (url.searchParams.get("names") ?? "").split(",").filter(Boolean);
    const startHour = parseInt(url.searchParams.get("startHour") ?? "8", 10);
    const endHour = parseInt(url.searchParams.get("endHour") ?? "21", 10);

    if (topicIds.length === 0) {
      return NextResponse.json({ error: "No topics provided", days: [] }, { status: 400 });
    }

    const days: DayPlan[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

      // Cycle through topics by urgency — most urgent first, then rotate
      const topicIdx = i % topicIds.length;
      const topicId = topicIds[topicIdx];
      const topicName = topicNames[topicIdx] || "Study";

      // Get free slots for this day
      const suggestion = await suggestSlots(goal, date.toISOString(), startHour, endHour);
      const slot = suggestion.slots.length > 0 ? suggestion.slots[0] : null;

      days.push({
        date: dateStr,
        dayLabel,
        topicName,
        topicId,
        slot,
      });
    }

    return NextResponse.json({ days });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate week plan";
    return NextResponse.json({ error: message, days: [] }, { status: 500 });
  }
}

/**
 * POST /api/calendar/week-plan — Push the week plan to calendar
 *
 * Body: { days: DayPlan[] }
 */
export async function POST(request: Request) {
  try {
    const { days } = (await request.json()) as { days: DayPlan[] };

    if (!days || days.length === 0) {
      return NextResponse.json({ error: "No days provided" }, { status: 400 });
    }

    const results: Array<{ date: string; ok: boolean; error?: string }> = [];

    for (const day of days) {
      if (!day.slot) {
        results.push({ date: day.date, ok: false, error: "No slot available" });
        continue;
      }

      const result = await pushEvent({
        title: `Learn: ${day.topicName}`,
        description: `laterlist study block\nTopic: ${day.topicName}`,
        startTime: day.slot.start,
        durationMinutes: day.slot.durationMinutes,
      });

      results.push({
        date: day.date,
        ok: result.ok,
        error: result.error,
      });
    }

    const created = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, created, total: days.length, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to push week plan";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
