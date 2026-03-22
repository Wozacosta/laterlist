/**
 * Bidirectional Calendar Completion Sync (LT-64)
 *
 * Syncs completion status between laterlist items and calendar events:
 * - laterlist → calendar: when item is marked done, delete/cancel the event
 * - calendar → laterlist: poll for cancelled/deleted events, mark items done
 *
 * Event mappings are stored in .data/calendar-event-map.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { google } from "googleapis";
import {
  getAuthenticatedClient,
  getConnectionStatus as getGoogleStatus,
} from "./calendarOAuth";
import {
  getCalDAVAuth,
  getConnectionStatus as getProtonStatus,
} from "./protonCalendar";
import { getItemById, updateItem } from "./store";

const DATA_DIR = join(process.cwd(), ".data");
const EVENT_MAP_FILE = join(DATA_DIR, "calendar-event-map.json");

export interface EventMapping {
  itemId: string;
  eventId: string;
  provider: "google" | "proton";
  createdAt: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── Event Map Storage ───────────────────────────────────────────────────────

export function readEventMap(): EventMapping[] {
  ensureDir();
  if (!existsSync(EVENT_MAP_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(EVENT_MAP_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeEventMap(mappings: EventMapping[]): void {
  ensureDir();
  writeFileSync(EVENT_MAP_FILE, JSON.stringify(mappings, null, 2));
}

/**
 * Record a new item↔event mapping after pushing to calendar.
 */
export function addEventMapping(
  itemId: string,
  eventId: string,
  provider: "google" | "proton"
): void {
  const mappings = readEventMap();
  // Avoid duplicates
  if (mappings.some((m) => m.itemId === itemId && m.eventId === eventId)) return;
  mappings.push({
    itemId,
    eventId,
    provider,
    createdAt: new Date().toISOString(),
  });
  writeEventMap(mappings);
}

/**
 * Get event mappings for a specific item.
 */
export function getEventMappingsForItem(itemId: string): EventMapping[] {
  return readEventMap().filter((m) => m.itemId === itemId);
}

/**
 * Remove all event mappings for an item.
 */
function removeEventMappingsForItem(itemId: string): EventMapping[] {
  const mappings = readEventMap();
  const removed = mappings.filter((m) => m.itemId === itemId);
  writeEventMap(mappings.filter((m) => m.itemId !== itemId));
  return removed;
}

// ── laterlist → Calendar (item done → cancel event) ─────────────────────────

async function deleteGoogleEvent(eventId: string): Promise<boolean> {
  try {
    const auth = getAuthenticatedClient();
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
  const caldav = getCalDAVAuth();
  if (!caldav) return false;

  try {
    const response = await fetch(
      `${caldav.url}/calendars/default/${eventId}.ics`,
      {
        method: "DELETE",
        headers: caldav.headers,
      }
    );
    return response.ok || response.status === 404; // 404 = already deleted
  } catch {
    return false;
  }
}

/**
 * When an item is marked done in laterlist, cancel/delete its calendar events.
 */
export async function syncItemCompletionToCalendar(
  itemId: string
): Promise<{ deleted: number; errors: number }> {
  const mappings = removeEventMappingsForItem(itemId);
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
    const auth = getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });
    if (res.data.status === "cancelled") return "cancelled";
    return "active";
  } catch {
    // 404 or error means the event was deleted
    return "cancelled";
  }
}

async function checkProtonEventStatus(
  eventId: string
): Promise<"active" | "cancelled" | "unknown"> {
  const caldav = getCalDAVAuth();
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

/**
 * Poll calendar for cancelled/deleted events and mark corresponding
 * items as done in laterlist.
 *
 * Returns the list of items that were marked done.
 */
export async function syncCalendarCompletionsToLaterlist(): Promise<{
  synced: string[];
  errors: string[];
}> {
  const mappings = readEventMap();
  const synced: string[] = [];
  const errors: string[] = [];
  const toRemove: Set<string> = new Set();

  for (const mapping of mappings) {
    // Skip items that are already done
    const item = getItemById(mapping.itemId);
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
        if (!getGoogleStatus().connected) continue;
      } catch { continue; }
      status = await checkGoogleEventStatus(mapping.eventId);
    } else {
      try {
        if (!getProtonStatus().connected) continue;
      } catch { continue; }
      status = await checkProtonEventStatus(mapping.eventId);
    }

    if (status === "cancelled") {
      // Event was deleted/cancelled in calendar → mark item done
      updateItem(mapping.itemId, {
        status: "done",
        doneAt: new Date().toISOString(),
      });
      synced.push(mapping.itemId);
      toRemove.add(`${mapping.itemId}:${mapping.eventId}`);
    }
  }

  // Clean up stale mappings
  if (toRemove.size > 0) {
    const remaining = mappings.filter(
      (m) => !toRemove.has(`${m.itemId}:${m.eventId}`)
    );
    writeEventMap(remaining);
  }

  return { synced, errors };
}

/**
 * Get sync status — number of active event mappings and sync availability.
 */
export function getSyncStatus(): {
  mappedEvents: number;
  provider: "google" | "proton" | null;
} {
  const mappings = readEventMap();
  let provider: "google" | "proton" | null = null;
  try {
    if (getGoogleStatus().connected) provider = "google";
  } catch { /* */ }
  if (!provider) {
    try {
      if (getProtonStatus().connected) provider = "proton";
    } catch { /* */ }
  }
  return { mappedEvents: mappings.length, provider };
}
