/**
 * Session History (LT-3J)
 *
 * Tracks completed Pomodoro/timer sessions with metadata beyond TimeLogs:
 * - Session type (work/break/freeform)
 * - Planned vs actual duration
 * - Completion status (completed/interrupted)
 * - Pomodoro cycle count
 *
 * Stored in .data/sessions.json.
 * Provides data for graph visualization and external tool integration.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const DATA_DIR = join(process.cwd(), ".data");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");

export interface Session {
  id: string;
  topicId: string;
  topicName: string;
  startedAt: string;      // ISO datetime
  endedAt: string;        // ISO datetime
  durationSeconds: number;
  type: "work" | "break" | "freeform";
  status: "completed" | "interrupted";
  pomodoroConfig?: {
    workMinutes: number;
    breakMinutes: number;
    cycleNumber: number; // which pomodoro cycle this was
  };
}

export interface SessionStats {
  totalSessions: number;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  averageWorkMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
  longestStreak: number;     // consecutive completed work sessions
  byDay: DaySessionStat[];
}

export interface DaySessionStat {
  date: string;           // YYYY-MM-DD
  sessions: number;
  workSeconds: number;
  breakSeconds: number;
  completed: number;
  interrupted: number;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── Storage ─────────────────────────────────────────────────────────────────

export function readSessions(): Session[] {
  ensureDir();
  if (!existsSync(SESSIONS_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeSessions(sessions: Session[]): void {
  ensureDir();
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Record a completed timer/pomodoro session.
 */
export function recordSession(data: {
  topicId: string;
  topicName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  type: "work" | "break" | "freeform";
  status: "completed" | "interrupted";
  pomodoroConfig?: Session["pomodoroConfig"];
}): Session {
  const session: Session = {
    id: `ses_${randomUUID()}`,
    ...data,
  };

  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);

  return session;
}

/**
 * Query sessions with optional filters.
 */
export function querySessions(opts?: {
  topicId?: string;
  type?: "work" | "break" | "freeform";
  since?: string;
  limit?: number;
}): Session[] {
  let sessions = readSessions();

  if (opts?.topicId) {
    sessions = sessions.filter((s) => s.topicId === opts.topicId);
  }
  if (opts?.type) {
    sessions = sessions.filter((s) => s.type === opts.type);
  }
  if (opts?.since) {
    sessions = sessions.filter((s) => s.startedAt >= opts.since!);
  }

  // Sort newest first
  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  if (opts?.limit && opts.limit > 0) {
    sessions = sessions.slice(0, opts.limit);
  }

  return sessions;
}

/**
 * Compute session statistics over a time range.
 */
export function getSessionStats(days: number = 30): SessionStats {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const sessions = querySessions({ since });

  const workSessions = sessions.filter((s) => s.type === "work" || s.type === "freeform");
  const breakSessions = sessions.filter((s) => s.type === "break");

  const totalWorkSeconds = workSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalBreakSeconds = breakSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const interruptedSessions = sessions.filter((s) => s.status === "interrupted").length;

  // Calculate longest streak of completed work sessions
  let longestStreak = 0;
  let currentStreak = 0;
  for (const s of [...sessions].reverse()) {
    if (s.type !== "break" && s.status === "completed") {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (s.type !== "break") {
      currentStreak = 0;
    }
  }

  // Group by day
  const dayMap = new Map<string, DaySessionStat>();
  for (const s of sessions) {
    const date = s.startedAt.slice(0, 10);
    const existing = dayMap.get(date) || {
      date,
      sessions: 0,
      workSeconds: 0,
      breakSeconds: 0,
      completed: 0,
      interrupted: 0,
    };

    existing.sessions++;
    if (s.type === "break") {
      existing.breakSeconds += s.durationSeconds;
    } else {
      existing.workSeconds += s.durationSeconds;
    }
    if (s.status === "completed") existing.completed++;
    else existing.interrupted++;

    dayMap.set(date, existing);
  }

  const byDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSessions: sessions.length,
    totalWorkSeconds,
    totalBreakSeconds,
    averageWorkMinutes: workSessions.length > 0
      ? Math.round(totalWorkSeconds / workSessions.length / 60)
      : 0,
    completedSessions,
    interruptedSessions,
    longestStreak,
    byDay,
  };
}

/**
 * Export sessions in a format compatible with external tools.
 * Returns JSON with session data suitable for pomodo.ink or similar.
 */
export function exportSessionData(days: number = 30): {
  version: string;
  exported: string;
  stats: SessionStats;
  sessions: Session[];
} {
  const stats = getSessionStats(days);
  const sessions = querySessions({
    since: new Date(Date.now() - days * 86_400_000).toISOString(),
  });

  return {
    version: "1.0",
    exported: new Date().toISOString(),
    stats,
    sessions,
  };
}
