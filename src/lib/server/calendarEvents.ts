/**
 * Calendar Event Push (LT-62)
 *
 * Push subtasks as time-blocked calendar events to connected calendars.
 * Supports Google Calendar (via googleapis) and Proton Calendar (via CalDAV).
 *
 * Events are created with:
 * - Title: "Learn: {item title}" (or topic name prefix)
 * - Duration: item.duration seconds (defaults to 30 min if unset)
 * - Description: item URL (if any) + topic name
 * - Start time: user-specified or defaults to next available hour
 */

import { google } from "googleapis";
import { randomUUID } from "crypto";
import {
  getAuthenticatedClient,
  getConnectionStatus as getGoogleStatus,
} from "./calendarOAuth";
import {
  getCalDAVAuth,
  getConnectionStatus as getProtonStatus,
} from "./protonCalendar";

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  durationMinutes: number;
  url?: string;
}

export interface PushResult {
  ok: boolean;
  provider: "google" | "proton";
  eventId?: string;
  error?: string;
}

// ── Google Calendar ─────────────────────────────────────────────────────────

async function pushToGoogle(event: CalendarEvent): Promise<PushResult> {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });

    const startDate = new Date(event.startTime);
    const endDate = new Date(startDate.getTime() + event.durationMinutes * 60_000);

    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        source: event.url ? { url: event.url, title: "laterlist" } : undefined,
      },
    });

    return {
      ok: true,
      provider: "google",
      eventId: res.data.id ?? undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create Google Calendar event";
    return { ok: false, provider: "google", error: message };
  }
}

// ── Proton Calendar (CalDAV) ────────────────────────────────────────────────

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

async function pushToProton(event: CalendarEvent): Promise<PushResult> {
  const caldav = await getCalDAVAuth();
  if (!caldav) {
    return { ok: false, provider: "proton", error: "Proton Calendar not connected" };
  }

  const uid = randomUUID();
  const startDate = new Date(event.startTime);
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60_000);

  const vcalendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//laterlist//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@laterlist`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
    event.url ? `URL:${event.url}` : "",
    `DTSTAMP:${formatICSDate(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  try {
    const response = await fetch(`${caldav.url}/calendars/default/${uid}.ics`, {
      method: "PUT",
      headers: {
        ...caldav.headers,
        "Content-Type": "text/calendar; charset=utf-8",
        "If-None-Match": "*",
      },
      body: vcalendar,
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "proton",
        error: `CalDAV PUT failed (HTTP ${response.status})`,
      };
    }

    return { ok: true, provider: "proton", eventId: uid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create Proton Calendar event";
    return { ok: false, provider: "proton", error: message };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect which calendar provider is connected.
 * Returns the first connected provider, or null if none.
 */
export async function getConnectedProvider(): Promise<"google" | "proton" | null> {
  try {
    if ((await getGoogleStatus()).connected) return "google";
  } catch { /* not configured */ }
  try {
    if ((await getProtonStatus()).connected) return "proton";
  } catch { /* not configured */ }
  return null;
}

/**
 * Push a subtask/item as a time-blocked calendar event.
 *
 * Automatically uses whichever calendar provider is connected.
 * If both are connected, Google is preferred.
 */
export async function pushEvent(event: CalendarEvent): Promise<PushResult> {
  const provider = await getConnectedProvider();

  if (!provider) {
    return {
      ok: false,
      provider: "google",
      error: "No calendar connected. Connect Google or Proton Calendar first.",
    };
  }

  if (provider === "google") {
    return pushToGoogle(event);
  }

  return pushToProton(event);
}

/**
 * Build a CalendarEvent from an item (subtask).
 */
export function buildEventFromItem(item: {
  title: string;
  url?: string;
  duration?: number;
  topicName?: string;
}, startTime?: string): CalendarEvent {
  const durationMinutes = item.duration ? Math.ceil(item.duration / 60) : 30;
  const prefix = item.topicName ? `${item.topicName}: ` : "Learn: ";

  // Default start: next full hour from now
  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);

  const parts: string[] = [];
  if (item.topicName) parts.push(`Topic: ${item.topicName}`);
  if (item.url) parts.push(item.url);
  parts.push("Created by laterlist");

  return {
    title: `${prefix}${item.title}`,
    description: parts.join("\n"),
    startTime: startTime || defaultStart.toISOString(),
    durationMinutes,
    url: item.url || undefined,
  };
}
