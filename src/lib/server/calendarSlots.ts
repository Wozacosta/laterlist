/**
 * Calendar Slot Suggestions (LT-63)
 *
 * Suggests time slots for learning based on:
 * - Free/busy data from connected calendar (Google or Proton)
 * - Daily learning goal (minutes per day)
 * - Preferred learning hours (default: 8am–9pm)
 * - Slot size matching (prefers goal-sized blocks, splits if needed)
 */

import { google } from "googleapis";
import {
  getAuthenticatedClient,
  getConnectionStatus as getGoogleStatus,
} from "./calendarOAuth";
import {
  getCalDAVAuth,
  getConnectionStatus as getProtonStatus,
} from "./protonCalendar";

const HOUR_MS = 60 * 60_000;

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  durationMinutes: number;
}

export interface BusyPeriod {
  start: string;
  end: string;
}

export interface SlotSuggestion {
  slots: TimeSlot[];
  provider: "google" | "proton" | "local";
  date: string; // YYYY-MM-DD
  dailyGoalMinutes: number;
  totalFreeMinutes: number;
}

// ── Free/Busy from Google Calendar ──────────────────────────────────────────

async function getGoogleBusyPeriods(
  dayStart: Date,
  dayEnd: Date
): Promise<BusyPeriod[]> {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = res.data.calendars?.primary?.busy ?? [];
  return busy
    .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
    .map((b) => ({ start: b.start!, end: b.end! }));
}

// ── Free/Busy from Proton Calendar (CalDAV) ─────────────────────────────────

function formatCalDAVDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

async function getProtonBusyPeriods(
  dayStart: Date,
  dayEnd: Date
): Promise<BusyPeriod[]> {
  const caldav = await getCalDAVAuth();
  if (!caldav) return [];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${formatCalDAVDate(dayStart)}" end="${formatCalDAVDate(dayEnd)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  try {
    const response = await fetch(`${caldav.url}/calendars/`, {
      method: "REPORT",
      headers: {
        ...caldav.headers,
        Depth: "1",
      },
      body,
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseVEventBusyPeriods(xml);
  } catch {
    return [];
  }
}

/**
 * Extract busy periods from CalDAV REPORT XML containing VEVENTs.
 */
function parseVEventBusyPeriods(xml: string): BusyPeriod[] {
  const periods: BusyPeriod[] = [];
  const dtStartRegex = /DTSTART[^:]*:(\d{8}T\d{6}Z?)/g;
  const dtEndRegex = /DTEND[^:]*:(\d{8}T\d{6}Z?)/g;

  const starts: string[] = [];
  const ends: string[] = [];
  let match;
  while ((match = dtStartRegex.exec(xml)) !== null) starts.push(match[1]);
  while ((match = dtEndRegex.exec(xml)) !== null) ends.push(match[1]);

  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    periods.push({
      start: parseICSDate(starts[i]).toISOString(),
      end: parseICSDate(ends[i]).toISOString(),
    });
  }

  return periods;
}

function parseICSDate(ics: string): Date {
  // Format: 20260322T120000Z or 20260322T120000
  const year = parseInt(ics.slice(0, 4), 10);
  const month = parseInt(ics.slice(4, 6), 10) - 1;
  const day = parseInt(ics.slice(6, 8), 10);
  const hour = parseInt(ics.slice(9, 11), 10);
  const min = parseInt(ics.slice(11, 13), 10);
  const sec = parseInt(ics.slice(13, 15), 10);
  if (ics.endsWith("Z")) {
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return new Date(year, month, day, hour, min, sec);
}

// ── Slot Finding Algorithm ──────────────────────────────────────────────────

/**
 * Find free time slots in a day, avoiding busy periods.
 *
 * @param dayStart - Start of the window (e.g., 8am)
 * @param dayEnd - End of the window (e.g., 9pm)
 * @param busy - Sorted list of busy periods
 * @param minSlotMinutes - Minimum useful slot (default: 15 min)
 */
function findFreeSlots(
  dayStart: Date,
  dayEnd: Date,
  busy: BusyPeriod[],
  minSlotMinutes: number = 15
): TimeSlot[] {
  // Sort busy periods by start time
  const sorted = [...busy].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const slots: TimeSlot[] = [];
  let cursor = dayStart.getTime();
  const endMs = dayEnd.getTime();

  for (const period of sorted) {
    const busyStart = new Date(period.start).getTime();
    const busyEnd = new Date(period.end).getTime();

    // If there's a gap before this busy period
    if (busyStart > cursor) {
      const gapEnd = Math.min(busyStart, endMs);
      const gapMinutes = Math.round((gapEnd - cursor) / 60_000);
      if (gapMinutes >= minSlotMinutes) {
        slots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(gapEnd).toISOString(),
          durationMinutes: gapMinutes,
        });
      }
    }

    // Advance cursor past the busy period
    cursor = Math.max(cursor, busyEnd);
  }

  // Gap after last busy period
  if (cursor < endMs) {
    const gapMinutes = Math.round((endMs - cursor) / 60_000);
    if (gapMinutes >= minSlotMinutes) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(endMs).toISOString(),
        durationMinutes: gapMinutes,
      });
    }
  }

  return slots;
}

/**
 * Pick the best slots that sum to the daily goal duration.
 * Prefers larger contiguous blocks. Splits large blocks if needed.
 */
function pickSlotsForGoal(
  freeSlots: TimeSlot[],
  goalMinutes: number
): TimeSlot[] {
  if (goalMinutes <= 0) return [];

  const result: TimeSlot[] = [];
  let remaining = goalMinutes;

  // Sort by size descending — prefer larger blocks
  const sorted = [...freeSlots].sort(
    (a, b) => b.durationMinutes - a.durationMinutes
  );

  for (const slot of sorted) {
    if (remaining <= 0) break;

    if (slot.durationMinutes <= remaining) {
      // Use the whole slot
      result.push(slot);
      remaining -= slot.durationMinutes;
    } else {
      // Use only part of the slot (trim from end)
      result.push({
        start: slot.start,
        end: new Date(
          new Date(slot.start).getTime() + remaining * 60_000
        ).toISOString(),
        durationMinutes: remaining,
      });
      remaining = 0;
    }
  }

  // Re-sort by start time for chronological display
  result.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return result;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Suggest learning time slots for a given day based on calendar free time
 * and the user's daily learning goal.
 *
 * @param dailyGoalMinutes - Target learning time for the day
 * @param date - Date to suggest for (defaults to today)
 * @param preferredStartHour - Earliest hour to consider (default: 8)
 * @param preferredEndHour - Latest hour to consider (default: 21)
 */
export async function suggestSlots(
  dailyGoalMinutes: number,
  date?: string,
  preferredStartHour: number = 8,
  preferredEndHour: number = 21
): Promise<SlotSuggestion> {
  const targetDate = date ? new Date(date) : new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);

  // Build the learning window for the day
  const dayStart = new Date(targetDate);
  dayStart.setHours(preferredStartHour, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(preferredEndHour, 0, 0, 0);

  // Fetch busy periods from connected calendar
  let busy: BusyPeriod[] = [];
  let provider: "google" | "proton" | "local" = "local";

  try {
    if ((await getGoogleStatus()).connected) {
      busy = await getGoogleBusyPeriods(dayStart, dayEnd);
      provider = "google";
    }
  } catch { /* Google not configured */ }

  if (provider === "local") {
    try {
      if ((await getProtonStatus()).connected) {
        busy = await getProtonBusyPeriods(dayStart, dayEnd);
        provider = "proton";
      }
    } catch { /* Proton not configured */ }
  }

  // Find free slots avoiding busy periods
  const freeSlots = findFreeSlots(dayStart, dayEnd, busy);
  const totalFreeMinutes = freeSlots.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // Pick slots matching the daily goal
  const goal = dailyGoalMinutes > 0 ? dailyGoalMinutes : 30;
  const suggestedSlots = pickSlotsForGoal(freeSlots, goal);

  return {
    slots: suggestedSlots,
    provider,
    date: dateStr,
    dailyGoalMinutes: goal,
    totalFreeMinutes,
  };
}

// Export for testing
export { findFreeSlots, pickSlotsForGoal };
