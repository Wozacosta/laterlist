/**
 * Proton Calendar Connection (LT-61)
 *
 * Proton Calendar uses CalDAV protocol (not OAuth). Users provide their
 * Proton email and an app-specific password to connect.
 *
 * CalDAV endpoint: https://calendar.proton.me/api/
 * Auth: HTTP Basic (email:password)
 *
 * Credentials are stored in .data/proton-calendar-credentials.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const CREDENTIALS_FILE = join(DATA_DIR, "proton-calendar-credentials.json");

const PROTON_CALDAV_BASE = "https://calendar.proton.me/api";

export interface ProtonCredentials {
  email: string;
  password: string; // app-specific password
  caldavUrl: string;
  connectedAt: string;
  verified: boolean;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── Credential Storage ──────────────────────────────────────────────────────

export function readCredentials(): ProtonCredentials | null {
  ensureDir();
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));
    if (!data || !data.email) return null;
    return data as ProtonCredentials;
  } catch {
    return null;
  }
}

function writeCredentials(creds: ProtonCredentials): void {
  ensureDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
}

function clearCredentials(): void {
  ensureDir();
  if (existsSync(CREDENTIALS_FILE)) {
    writeFileSync(CREDENTIALS_FILE, "null");
  }
}

// ── CalDAV Operations ───────────────────────────────────────────────────────

/**
 * Verify Proton Calendar credentials by sending a CalDAV PROPFIND request.
 * Returns the list of calendar display names on success.
 */
export async function verifyConnection(
  email: string,
  password: string,
  caldavUrl: string = PROTON_CALDAV_BASE
): Promise<{ ok: boolean; calendars?: string[]; error?: string }> {
  const authHeader = `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`;

  try {
    const response = await fetch(`${caldavUrl}/calendars/`, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:cs="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid credentials. Use an app-specific password from Proton settings." };
    }

    if (!response.ok) {
      return { ok: false, error: `CalDAV request failed (HTTP ${response.status})` };
    }

    // Parse the XML response to extract calendar names
    const xml = await response.text();
    const calendars = parseCalendarNames(xml);

    return { ok: true, calendars };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    // Network errors often mean the CalDAV URL is wrong or Proton is unreachable
    if (message.includes("fetch")) {
      return { ok: false, error: "Could not reach Proton Calendar. Check your network connection." };
    }
    return { ok: false, error: message };
  }
}

/**
 * Extract calendar display names from CalDAV PROPFIND XML response.
 */
function parseCalendarNames(xml: string): string[] {
  const names: string[] = [];
  // Simple regex-based extraction — avoids XML parser dependency
  const displayNameRegex = /<d:displayname>([^<]+)<\/d:displayname>/gi;
  let match;
  while ((match = displayNameRegex.exec(xml)) !== null) {
    const name = match[1].trim();
    if (name) names.push(name);
  }
  return names;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Connect to Proton Calendar. Verifies credentials before storing.
 */
export async function connect(
  email: string,
  password: string,
  caldavUrl?: string
): Promise<{ ok: boolean; error?: string; calendars?: string[] }> {
  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const url = caldavUrl || PROTON_CALDAV_BASE;
  const result = await verifyConnection(email, password, url);

  if (!result.ok) {
    return result;
  }

  writeCredentials({
    email,
    password,
    caldavUrl: url,
    connectedAt: new Date().toISOString(),
    verified: true,
  });

  return { ok: true, calendars: result.calendars };
}

/**
 * Disconnect from Proton Calendar.
 */
export function disconnect(): void {
  clearCredentials();
}

/**
 * Get the current Proton Calendar connection status.
 */
export function getConnectionStatus(): {
  connected: boolean;
  email?: string;
  connectedAt?: string;
} {
  const creds = readCredentials();
  if (!creds || !creds.verified) {
    return { connected: false };
  }
  return {
    connected: true,
    email: creds.email,
    connectedAt: creds.connectedAt,
  };
}

/**
 * Get an authenticated CalDAV fetch helper for making calendar requests.
 */
export function getCalDAVAuth(): { url: string; headers: Record<string, string> } | null {
  const creds = readCredentials();
  if (!creds) return null;

  return {
    url: creds.caldavUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.password}`).toString("base64")}`,
      "Content-Type": "application/xml; charset=utf-8",
    },
  };
}
