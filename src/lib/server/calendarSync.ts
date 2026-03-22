/**
 * Bidirectional Calendar Completion Sync (LT-64)
 *
 * Syncs completion status between laterlist items and calendar events:
 * - laterlist → calendar: when item is marked done, delete/cancel the event
 * - calendar → laterlist: poll for cancelled/deleted events, mark items done
 *
 * Event mappings stored in KV (Upstash Redis on Vercel, file-based locally).
 */

import { google } from "googleapis";
import { kvGet, kvSet } from "./storage";
import {
  getAuthenticatedClient,
  getConnectionStatus as getGoogleStatus,
} from "./calendarOAuth";
import {
  getCalDAVAuth,
  getConnectionStatus as getProtonStatus,
} from "./protonCalendar";
import { getItemById, updateItem } from "./store";

const EVENT_MAP_KEY = "laterlist:calendar-events";

export interface EventMapping {
  itemId: string;
  eventId: string;
  provider: "google" | "proton";
  createdAt: string;
}

// ── Event Map Storage ───────────────────────────────────────────────────────

export async function readEventMap(): Promise<EventMapping[]> {
  return (await kvGet<EventMapping[]>(EVENT_MAP_KEY)) ?? [];
}

async function writeEventMap(mappings: EventMapping[]): Promise<void> {
  await kvSet(EVENT_MAP_KEY, mappings);
}

export async function addEventMapping(
  itemId: string,
  eventId: string,
  provider: "google" | "proton"
): Promise<void> {
  const mappings = await readEventMap();
  if (mappings.some((m) => m.itemId === itemId && m.eventId === eventId)) return;
  mappings.push({
    itemId,
    eventId,
    provider,
    createdAt: new Date().toISOString(),
  });
  await writeEventMap(mappings);
}

export async function getEventMappingsForItem(itemId: string): Promise<EventMapping[]> {
  return (await readEventMap()).filter((m) => m.itemId === itemId);
}

async function removeEventMappingsForItem(itemId: string): Promise<EventMapping[]> {
  const mappings = await readEventMap();
  const removed = mappings.filter((m) => m.itemId === itemId);
  await writeEventMap(mappings.filter((m) => m.itemId !== itemId));
  return removed;
}

// ── laterlist → Calendar (item done → cancel event) ─────────────────────────

async function deleteGoogleEvent(eventId: string): Promise<boolean> {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    return true;
  } catch {
    return false;
  }
}

async function deleteProtonEvent(eventId: string): Promise<boolean> {
  const caldav = await getCalDAVAuth();
  if (!caldav) return false;

  try {
    const response = await fetch(
      `${caldav.url}/calendars/default/${eventId}.ics`,
      {
        method: "DELETE",
        headers: caldav.headers,
      }
    );
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

export async function syncItemCompletionToCalendar(
  itemId: string
): Promise<{ deleted: number; errors: number }> {
  const mappings = await removeEventMappingsForItem(itemId);
  let deleted = 0;
  let errors = 0;

  for (const mapping of mappings) {
    let ok = false;
    if (mapping.provider === "google") {
      ok = await deleteGoogleEvent(mapping.eventId);
    } else {
      ok = await deleteProtonEvent(mapping.eventId);
    }
    if (ok) deleted++;
    else errors++;
  }

  return { deleted, errors };
}

// ── Calendar → laterlist (poll for cancelled events) ────────────────────────

async function checkGoogleEventStatus(
  eventId: string
): Promise<"active" | "cancelled" | "unknown"> {
  try {
    const auth = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });
    if (res.data.status === "cancelled") return "cancelled";
    return "active";
  } catch {
    return "cancelled";
  }
}

async function checkProtonEventStatus(
  eventId: string
): Promise<"active" | "cancelled" | "unknown"> {
  const caldav = await getCalDAVAuth();
  if (!caldav) return "unknown";

  try {
    const response = await fetch(
      `${caldav.url}/calendars/default/${eventId}.ics`,
      {
        method: "HEAD",
        headers: caldav.headers,
      }
    );
    if (response.ok) return "active";
    if (response.status === 404) return "cancelled";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function syncCalendarCompletionsToLaterlist(): Promise<{
  synced: string[];
  errors: string[];
}> {
  const mappings = await readEventMap();
  const synced: string[] = [];
  const errors: string[] = [];
  const toRemove: Set<string> = new Set();

  for (const mapping of mappings) {
    const item = await getItemById(mapping.itemId);
    if (!item) {
      toRemove.add(`${mapping.itemId}:${mapping.eventId}`);
      continue;
    }
    if (item.status === "done") {
      toRemove.add(`${mapping.itemId}:${mapping.eventId}`);
      continue;
    }

    let status: "active" | "cancelled" | "unknown";
    if (mapping.provider === "google") {
      try {
        if (!(await getGoogleStatus()).connected) continue;
      } catch { continue; }
      status = await checkGoogleEventStatus(mapping.eventId);
    } else {
      try {
        if (!(await getProtonStatus()).connected) continue;
      } catch { continue; }
      status = await checkProtonEventStatus(mapping.eventId);
    }

    if (status === "cancelled") {
      await updateItem(mapping.itemId, {
        status: "done",
        doneAt: new Date().toISOString(),
      });
      synced.push(mapping.itemId);
      toRemove.add(`${mapping.itemId}:${mapping.eventId}`);
    }
  }

  if (toRemove.size > 0) {
    const remaining = mappings.filter(
      (m) => !toRemove.has(`${m.itemId}:${m.eventId}`)
    );
    await writeEventMap(remaining);
  }

  return { synced, errors };
}

export async function getSyncStatus(): Promise<{
  mappedEvents: number;
  provider: "google" | "proton" | null;
}> {
  const mappings = await readEventMap();
  let provider: "google" | "proton" | null = null;
  try {
    if ((await getGoogleStatus()).connected) provider = "google";
  } catch { /* */ }
  if (!provider) {
    try {
      if ((await getProtonStatus()).connected) provider = "proton";
    } catch { /* */ }
  }
  return { mappedEvents: mappings.length, provider };
}
