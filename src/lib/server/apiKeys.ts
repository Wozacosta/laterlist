import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const DATA_DIR = join(process.cwd(), ".data");
const KEYS_FILE = join(DATA_DIR, "api-keys.json");

export interface ApiKey {
  id: string;
  key: string; // the actual bearer token (shown once on creation)
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

/** Stored key entry — key is hashed for security. */
interface StoredKey {
  id: string;
  keyHash: string;
  keyPrefix: string; // first 8 chars for display
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashKey(key: string): string {
  // Simple hash using built-in crypto
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(key).digest("hex");
}

function readKeys(): StoredKey[] {
  ensureDir();
  if (!existsSync(KEYS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeKeys(keys: StoredKey[]) {
  ensureDir();
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

/**
 * Generate a new API key. Returns the full key (shown once to the user).
 */
export function generateApiKey(name: string): { id: string; key: string; name: string; createdAt: string; keyPrefix: string } {
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

  const keys = readKeys();
  keys.push(stored);
  writeKeys(keys);

  return { id, key, name: stored.name, createdAt: now, keyPrefix: stored.keyPrefix };
}

/**
 * List all API keys (without the actual key values).
 */
export function listApiKeys(): Array<{ id: string; keyPrefix: string; name: string; createdAt: string; lastUsedAt?: string }> {
  return readKeys().map((k) => ({
    id: k.id,
    keyPrefix: k.keyPrefix,
    name: k.name,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));
}

/**
 * Revoke (delete) an API key by ID.
 */
export function revokeApiKey(id: string): boolean {
  const keys = readKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  writeKeys(filtered);
  return true;
}

/**
 * Validate a bearer token. Returns true if valid.
 * Updates lastUsedAt on successful validation.
 */
export function validateApiKey(token: string): boolean {
  if (!token) return false;
  const keys = readKeys();
  const h = hashKey(token);
  const idx = keys.findIndex((k) => k.keyHash === h);
  if (idx === -1) return false;

  // Update last used timestamp
  keys[idx].lastUsedAt = new Date().toISOString();
  writeKeys(keys);
  return true;
}

/**
 * Returns true if any API keys have been created.
 * When no keys exist, auth is disabled (open access).
 */
export function hasAnyKeys(): boolean {
  return readKeys().length > 0;
}
