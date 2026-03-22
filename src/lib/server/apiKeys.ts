import { randomBytes } from "crypto";
import { kvGet, kvSet } from "./storage";

const KEYS_KEY = "laterlist:api-keys";

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface StoredKey {
  id: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

function hashKey(key: string): string {
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(key).digest("hex");
}

async function readKeys(): Promise<StoredKey[]> {
  return (await kvGet<StoredKey[]>(KEYS_KEY)) ?? [];
}

async function writeKeys(keys: StoredKey[]): Promise<void> {
  await kvSet(KEYS_KEY, keys);
}

export async function generateApiKey(name: string): Promise<{ id: string; key: string; name: string; createdAt: string; keyPrefix: string }> {
  const key = `ll_${randomBytes(24).toString("hex")}`;
  const id = `key_${randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();

  const stored: StoredKey = {
    id,
    keyHash: hashKey(key),
    keyPrefix: key.slice(0, 8),
    name: name.trim() || "Unnamed key",
    createdAt: now,
  };

  const keys = await readKeys();
  keys.push(stored);
  await writeKeys(keys);

  return { id, key, name: stored.name, createdAt: now, keyPrefix: stored.keyPrefix };
}

export async function listApiKeys(): Promise<Array<{ id: string; keyPrefix: string; name: string; createdAt: string; lastUsedAt?: string }>> {
  return (await readKeys()).map((k) => ({
    id: k.id,
    keyPrefix: k.keyPrefix,
    name: k.name,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const keys = await readKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  await writeKeys(filtered);
  return true;
}

export async function validateApiKey(token: string): Promise<boolean> {
  if (!token) return false;
  const keys = await readKeys();
  const h = hashKey(token);
  const idx = keys.findIndex((k) => k.keyHash === h);
  if (idx === -1) return false;

  keys[idx].lastUsedAt = new Date().toISOString();
  await writeKeys(keys);
  return true;
}

export async function hasAnyKeys(): Promise<boolean> {
  return (await readKeys()).length > 0;
}
