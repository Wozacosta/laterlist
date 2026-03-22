import { NextResponse, type NextRequest } from "next/server";
import {
  recordSession,
  querySessions,
  getSessionStats,
  exportSessionData,
} from "@/lib/server/sessionHistory";

/**
 * GET /api/sessions — Query sessions or get stats/export
 *
 * Query params:
 *   ?topicId=...   — Filter by topic ID
 *   ?type=work     — Filter by type (work/break/freeform)
 *   ?since=...     — ISO datetime filter (sessions after this date)
 *   ?limit=50      — Max results (default: 50)
 *   ?stats=true    — Return session statistics instead of raw sessions
 *   ?export=true   — Return full export data (sessions + stats)
 *   ?days=30       — Number of days for stats/export (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const isStats = url.searchParams.get("stats") === "true";
    const isExport = url.searchParams.get("export") === "true";
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    if (isExport) {
      return NextResponse.json(exportSessionData(days));
    }

    if (isStats) {
      return NextResponse.json(getSessionStats(days));
    }

    const sessions = querySessions({
      topicId: url.searchParams.get("topicId") ?? undefined,
      type: (url.searchParams.get("type") as "work" | "break" | "freeform") ?? undefined,
      since: url.searchParams.get("since") ?? undefined,
      limit: parseInt(url.searchParams.get("limit") ?? "50", 10),
    });

    return NextResponse.json({ sessions, count: sessions.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to query sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sessions — Record a completed session
 *
 * Body: {
 *   topicId: string,
 *   topicName: string,
 *   startedAt: string,       // ISO datetime
 *   endedAt: string,         // ISO datetime
 *   durationSeconds: number,
 *   type: "work" | "break" | "freeform",
 *   status: "completed" | "interrupted",
 *   pomodoroConfig?: { workMinutes, breakMinutes, cycleNumber }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      topicId,
      topicName,
      startedAt,
      endedAt,
      durationSeconds,
      type,
      status,
      pomodoroConfig,
    } = body;

    if (!topicId || !topicName || !startedAt || !endedAt || !durationSeconds || !type || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const session = recordSession({
      topicId,
      topicName,
      startedAt,
      endedAt,
      durationSeconds,
      type,
      status,
      pomodoroConfig,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
