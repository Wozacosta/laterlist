/**
 * Google Calendar OAuth (LT-60)
 *
 * Manages the OAuth 2.0 flow for connecting a Google Calendar account.
 * Tokens are stored in .data/google-calendar-tokens.json.
 *
 * Required environment variables:
 *   GOOGLE_CLIENT_ID     — OAuth client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET — OAuth client secret
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { google } from "googleapis";

const DATA_DIR = join(process.cwd(), ".data");
const TOKENS_FILE = join(DATA_DIR, "google-calendar-tokens.json");

// Google Calendar API scopes
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export interface CalendarTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  email?: string;
  connectedAt: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/oauth/google/callback`;
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

// ── Token Storage ───────────────────────────────────────────────────────────

export function readTokens(): CalendarTokens | null {
  ensureDir();
  if (!existsSync(TOKENS_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(TOKENS_FILE, "utf-8"));
    return data as CalendarTokens;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: CalendarTokens): void {
  ensureDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function clearTokens(): void {
  ensureDir();
  if (existsSync(TOKENS_FILE)) {
    writeFileSync(TOKENS_FILE, "null");
  }
}

// ── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Generate the Google OAuth consent URL.
 * The user visits this URL to authorize calendar access.
 */
export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent to always get refresh_token
  });
}

/**
 * Exchange the authorization code for tokens and store them.
 */
export async function exchangeCode(code: string): Promise<CalendarTokens> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get access/refresh tokens from Google");
  }

  // Fetch the user's email for display
  client.setCredentials(tokens);
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email ?? undefined;
  } catch {
    // Non-critical — email is just for display
  }

  const stored: CalendarTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope ?? SCOPES.join(" "),
    token_type: tokens.token_type ?? "Bearer",
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    email,
    connectedAt: new Date().toISOString(),
  };

  writeTokens(stored);
  return stored;
}

/**
 * Get an authenticated OAuth2 client with valid tokens.
 * Automatically refreshes expired tokens.
 */
export function getAuthenticatedClient() {
  const tokens = readTokens();
  if (!tokens) {
    throw new Error("No Google Calendar tokens found — connect first");
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Auto-refresh handler: persist new tokens when refreshed
  client.on("tokens", (newTokens) => {
    const current = readTokens();
    if (current) {
      writeTokens({
        ...current,
        access_token: newTokens.access_token ?? current.access_token,
        expiry_date: newTokens.expiry_date ?? current.expiry_date,
      });
    }
  });

  return client;
}

/**
 * Revoke the Google Calendar connection and clear stored tokens.
 */
export async function disconnect(): Promise<void> {
  const tokens = readTokens();
  if (tokens) {
    try {
      const client = getOAuth2Client();
      await client.revokeToken(tokens.access_token);
    } catch {
      // Revocation may fail if token is already expired — that's OK
    }
  }
  clearTokens();
}

/**
 * Get the current connection status.
 */
export function getConnectionStatus(): {
  connected: boolean;
  email?: string;
  connectedAt?: string;
} {
  const tokens = readTokens();
  if (!tokens || !tokens.refresh_token) {
    return { connected: false };
  }
  return {
    connected: true,
    email: tokens.email,
    connectedAt: tokens.connectedAt,
  };
}
