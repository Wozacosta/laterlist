/**
 * Proton Calendar Connection (LT-61)
 *
 * Proton Calendar uses CalDAV protocol (not OAuth). Users provide their
 * Proton email and an app-specific password to connect.
 *
 * CalDAV endpoint: https://calendar.proton.me/api/
 * Auth: HTTP Basic (email:password)
 *
 * Credentials stored in KV (Upstash Redis on Vercel, file-based locally).
 */

import { kvGet, kvSet, kvDel } from "./storage";

const CREDENTIALS_KEY = "laterlist:proton-creds";
const PROTON_CALDAV_BASE = "https://calendar.proton.me/api";

export interface ProtonCredentials {
  email: string;
  password: string;
  caldavUrl: string;
  connectedAt: string;
  verified: boolean;
}

// ── Credential Storage ──────────────────────────────────────────────────────

export async function readCredentials(): Promise<ProtonCredentials | null> {
  const data = await kvGet<ProtonCredentials>(CREDENTIALS_KEY);
  if (!data || !data.email) return null;
  return data;
}

async function writeCredentials(creds: ProtonCredentials): Promise<void> {
  await kvSet(CREDENTIALS_KEY, creds);
}

async function clearCredentials(): Promise<void> {
  await kvDel(CREDENTIALS_KEY);
}

// ── CalDAV Operations ───────────────────────────────────────────────────────

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

    const xml = await response.text();
    const calendars = parseCalendarNames(xml);

    return { ok: true, calendars };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    if (message.includes("fetch")) {
      return { ok: false, error: "Could not reach Proton Calendar. Check your network connection." };
    }
    return { ok: false, error: message };
  }
}

function parseCalendarNames(xml: string): string[] {
  const names: string[] = [];
  const displayNameRegex = /<d:displayname>([^<]+)<\/d:displayname>/gi;
  let match;
  while ((match = displayNameRegex.exec(xml)) !== null) {
    const name = match[1].trim();
    if (name) names.push(name);
  }
  return names;
}

// ── Public API ──────────────────────────────────────────────────────────────

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

  await writeCredentials({
    email,
    password,
    caldavUrl: url,
    connectedAt: new Date().toISOString(),
    verified: true,
  });

  return { ok: true, calendars: result.calendars };
}

export async function disconnect(): Promise<void> {
  await clearCredentials();
}

export async function getConnectionStatus(): Promise<{
  connected: boolean;
  email?: string;
  connectedAt?: string;
}> {
  const creds = await readCredentials();
  if (!creds || !creds.verified) {
    return { connected: false };
  }
  return {
    connected: true,
    email: creds.email,
    connectedAt: creds.connectedAt,
  };
}

export async function getCalDAVAuth(): Promise<{ url: string; headers: Record<string, string> } | null> {
  const creds = await readCredentials();
  if (!creds) return null;

  return {
    url: creds.caldavUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.password}`).toString("base64")}`,
      "Content-Type": "application/xml; charset=utf-8",
    },
  };
}
