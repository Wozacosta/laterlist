// Tokens last an hour, so renew them well before that.
const TOKEN_TTL_MS = 50 * 60_000;

let cached: { token: string; expiresAt: number } | null = null;

function config() {
  const databaseUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL;
  const clientId = process.env.DEXIE_CLOUD_CLIENT_ID;
  const clientSecret = process.env.DEXIE_CLOUD_CLIENT_SECRET;
  const email = process.env.MCP_USER_EMAIL;

  if (!databaseUrl || !clientId || !clientSecret || !email) {
    throw new Error("Dexie Cloud access isn't configured");
  }
  return { databaseUrl, clientId, clientSecret, email };
}

async function userToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { databaseUrl, clientId, clientSecret, email } = config();
  const res = await fetch(`${databaseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scopes: ["ACCESS_DB", "IMPERSONATE"],
      claims: { sub: email, email },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Dexie Cloud token request failed: ${res.status}`);

  const { accessToken } = await res.json();
  cached = { token: accessToken, expiresAt: Date.now() + TOKEN_TTL_MS };
  return accessToken;
}

/** Forgets the cached token. Only tests need this. */
export function clearTokenCache(): void {
  cached = null;
}

/** Reads every row of a table that the configured user can see. */
export async function readRows<T>(table: string): Promise<T[]> {
  const { databaseUrl } = config();
  const res = await fetch(`${databaseUrl}/my/${table}`, {
    headers: { Authorization: `Bearer ${await userToken()}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Dexie Cloud read failed: ${res.status}`);
  return res.json();
}

/**
 * Writes rows into the configured user's private realm. A row with an existing
 * id is replaced whole, so never send a partial row.
 */
export async function writeRows(table: string, rows: object[]): Promise<void> {
  const { databaseUrl, email } = config();
  const res = await fetch(`${databaseUrl}/my/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await userToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rows.map((row) => ({ ...row, owner: email }))),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Dexie Cloud write failed: ${res.status}`);
}
