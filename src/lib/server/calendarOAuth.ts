/**
 * Google Calendar OAuth (LT-60)
 *
 * Manages the OAuth 2.0 flow for connecting a Google Calendar account.
 * Tokens stored in KV (Upstash Redis on Vercel, file-based locally).
 *
 * Required environment variables:
 *   GOOGLE_CLIENT_ID     — OAuth client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET — OAuth client secret
 */

import { google } from "googleapis";
import { kvGet, kvSet, kvDel } from "./storage";

const TOKENS_KEY = "laterlist:google-tokens";

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

export async function readTokens(): Promise<CalendarTokens | null> {
  return kvGet<CalendarTokens>(TOKENS_KEY);
}

export async function writeTokens(tokens: CalendarTokens): Promise<void> {
  await kvSet(TOKENS_KEY, tokens);
}

export async function clearTokens(): Promise<void> {
  await kvDel(TOKENS_KEY);
}

// ── OAuth Flow ──────────────────────────────────────────────────────────────

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string): Promise<CalendarTokens> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get access/refresh tokens from Google");
  }

  client.setCredentials(tokens);
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email ?? undefined;
  } catch {
    // Non-critical
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

  await writeTokens(stored);
  return stored;
}

export async function getAuthenticatedClient() {
  const tokens = await readTokens();
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
  client.on("tokens", async (newTokens) => {
    const current = await readTokens();
    if (current) {
      await writeTokens({
        ...current,
        access_token: newTokens.access_token ?? current.access_token,
        expiry_date: newTokens.expiry_date ?? current.expiry_date,
      });
    }
  });

  return client;
}

export async function disconnect(): Promise<void> {
  const tokens = await readTokens();
  if (tokens) {
    try {
      const client = getOAuth2Client();
      await client.revokeToken(tokens.access_token);
    } catch {
      // Revocation may fail if token is already expired
    }
  }
  await clearTokens();
}

export async function getConnectionStatus(): Promise<{
  connected: boolean;
  email?: string;
  connectedAt?: string;
}> {
  const tokens = await readTokens();
  if (!tokens || !tokens.refresh_token) {
    return { connected: false };
  }
  return {
    connected: true,
    email: tokens.email,
    connectedAt: tokens.connectedAt,
  };
}
