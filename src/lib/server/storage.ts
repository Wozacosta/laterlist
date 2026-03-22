/**
 * Storage abstraction — uses Upstash Redis when available (Vercel),
 * falls back to file-based storage for local development.
 *
 * Set KV_REST_API_URL and KV_REST_API_TOKEN env vars to enable Redis.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }
  return null;
}

// ── File-based fallback (local dev) ─────────────────────────────────────────

function getFileStore() {
  // Dynamic import to avoid bundling fs in edge runtime
  const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
  const { join } = require("path");
  const dir = join(process.cwd(), ".data");

  return {
    async get<T>(key: string): Promise<T | null> {
      const file = join(dir, `${key}.json`);
      if (!existsSync(file)) return null;
      try {
        return JSON.parse(readFileSync(file, "utf-8"));
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const file = join(dir, `${key}.json`);
      writeFileSync(file, JSON.stringify(value, null, 2));
    },
    async del(key: string): Promise<void> {
      const file = join(dir, `${key}.json`);
      if (existsSync(file)) writeFileSync(file, "null");
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function kvGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) return r.get<T>(key);
  return getFileStore().get<T>(key);
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.set(key, JSON.stringify(value));
    return;
  }
  return getFileStore().set(key, value);
}

export async function kvDel(key: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(key);
    return;
  }
  return getFileStore().del(key);
}
