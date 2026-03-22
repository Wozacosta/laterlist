import { NextResponse } from "next/server";
import { seedMockData, clearAllData } from "@/lib/seed";

/**
 * POST /api/seed — Populate the app with realistic mock data (LT-90)
 *
 * Query params:
 *   ?seed=42    — PRNG seed for deterministic data (default: 42)
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
  const clear = url.searchParams.get("clear") === "true";

  if (clear) {
    clearAllData();
  }

  const result = seedMockData(seed);

  return NextResponse.json({
    ok: true,
    seeded: result,
    seed,
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
