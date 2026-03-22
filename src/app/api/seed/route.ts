import { NextResponse } from "next/server";
import { seedMockData, clearAllData } from "@/lib/seed";

/**
 * POST /api/seed — Populate the app with realistic mock data (LT-90, LT-91)
 *
 * Query params:
 *   ?seed=42    — PRNG seed for deterministic data (default: 42)
 *   ?time=...   — Reference timestamp in ms (default: fixed 2026-03-22T12:00Z)
 *   ?clear=true — Clear all data before seeding
 *
 * Only available in development mode.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed endpoint is disabled in production" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const seed = parseInt(url.searchParams.get("seed") ?? "42", 10);
  const timeParam = url.searchParams.get("time");
  const refTime = timeParam ? parseInt(timeParam, 10) : undefined;
  const clear = url.searchParams.get("clear") === "true";

  if (clear) {
    clearAllData();
  }

  const result = seedMockData(seed, refTime);

  return NextResponse.json({
    ok: true,
    seeded: result,
    seed,
    referenceTime: refTime ?? "default (2026-03-22T12:00Z)",
    cleared: clear,
  });
}

/**
 * DELETE /api/seed — Clear all mock data
 *
 * Only available in development mode.
 */
export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed endpoint is disabled in production" },
      { status: 403 }
    );
  }

  clearAllData();
  return NextResponse.json({ ok: true, cleared: true });
}
