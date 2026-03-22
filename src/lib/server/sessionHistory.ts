/**
 * Session History (LT-3J)
 *
 * Tracks completed Pomodoro/timer sessions with metadata beyond TimeLogs:
 * - Session type (work/break/freeform)
 * - Planned vs actual duration
 * - Completion status (completed/interrupted)
 * - Pomodoro cycle count
 *
 * Stored in KV (Upstash Redis on Vercel, file-based locally).
 * Provides data for graph visualization and external tool integration.
 */

import { randomUUID } from "crypto";
import { kvGet, kvSet } from "./storage";

const SESSIONS_KEY = "laterlist:sessions";

export interface Session {
  id: string;
  topicId: string;
  topicName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  type: "work" | "break" | "freeform";
  status: "completed" | "interrupted";
  pomodoroConfig?: {
    workMinutes: number;
    breakMinutes: number;
    cycleNumber: number;
  };
}

export interface SessionStats {
  totalSessions: number;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  averageWorkMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
  longestStreak: number;
  byDay: DaySessionStat[];
}

export interface DaySessionStat {
  date: string;
  sessions: number;
  workSeconds: number;
  breakSeconds: number;
  completed: number;
  interrupted: number;
}

// ── Storage ─────────────────────────────────────────────────────────────────

export async function readSessions(): Promise<Session[]> {
  return (await kvGet<Session[]>(SESSIONS_KEY)) ?? [];
}

export async function writeSessions(sessions: Session[]): Promise<void> {
  await kvSet(SESSIONS_KEY, sessions);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function recordSession(data: {
  topicId: string;
  topicName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  type: "work" | "break" | "freeform";
  status: "completed" | "interrupted";
  pomodoroConfig?: Session["pomodoroConfig"];
}): Promise<Session> {
  const session: Session = {
    id: `ses_${randomUUID()}`,
    ...data,
  };

  const sessions = await readSessions();
  sessions.push(session);
  await writeSessions(sessions);

  return session;
}

export async function querySessions(opts?: {
  topicId?: string;
  type?: "work" | "break" | "freeform";
  since?: string;
  limit?: number;
}): Promise<Session[]> {
  let sessions = await readSessions();

  if (opts?.topicId) {
    sessions = sessions.filter((s) => s.topicId === opts.topicId);
  }
  if (opts?.type) {
    sessions = sessions.filter((s) => s.type === opts.type);
  }
  if (opts?.since) {
    sessions = sessions.filter((s) => s.startedAt >= opts.since!);
  }

  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  if (opts?.limit && opts.limit > 0) {
    sessions = sessions.slice(0, opts.limit);
  }

  return sessions;
}

export async function getSessionStats(days: number = 30): Promise<SessionStats> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const sessions = await querySessions({ since });

  const workSessions = sessions.filter((s) => s.type === "work" || s.type === "freeform");
  const breakSessions = sessions.filter((s) => s.type === "break");

  const totalWorkSeconds = workSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalBreakSeconds = breakSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const interruptedSessions = sessions.filter((s) => s.status === "interrupted").length;

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

export async function exportSessionData(days: number = 30): Promise<{
  version: string;
  exported: string;
  stats: SessionStats;
  sessions: Session[];
}> {
  const stats = await getSessionStats(days);
  const sessions = await querySessions({
    since: new Date(Date.now() - days * 86_400_000).toISOString(),
  });

  return {
    version: "1.0",
    exported: new Date().toISOString(),
    stats,
    sessions,
  };
}
