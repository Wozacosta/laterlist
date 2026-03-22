"use client";

import { memo, useState, useEffect, useCallback } from "react";

interface DaySessionStat {
  date: string;
  sessions: number;
  workSeconds: number;
  breakSeconds: number;
  completed: number;
  interrupted: number;
}

interface SessionStats {
  totalSessions: number;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  averageWorkMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
  longestStreak: number;
  byDay: DaySessionStat[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export const SessionGraph = memo(function SessionGraph() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions?stats=true&days=14");
      const data = await res.json();
      setStats(data);
      setExpanded(true);
    } catch {
      setStats(null);
    }
    setLoading(false);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions?export=true&days=30");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laterlist-sessions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export session data");
    }
  }, []);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={fetchStats}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        {loading ? "Loading sessions..." : "Session history"}
      </button>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No sessions recorded yet. Use the timer to start tracking.
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Calculate max for bar scaling
  const maxDaySeconds = Math.max(
    ...stats.byDay.map((d) => d.workSeconds + d.breakSeconds),
    1
  );

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-900 dark:bg-purple-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Session History
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
            title="Export session data (JSON)"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <div className="rounded bg-white/60 px-2 py-1.5 text-center dark:bg-gray-900/40">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {stats.totalSessions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">sessions</div>
        </div>
        <div className="rounded bg-white/60 px-2 py-1.5 text-center dark:bg-gray-900/40">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {formatDuration(stats.totalWorkSeconds)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">focus time</div>
        </div>
        <div className="rounded bg-white/60 px-2 py-1.5 text-center dark:bg-gray-900/40">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {stats.averageWorkMinutes}m
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">avg session</div>
        </div>
        <div className="rounded bg-white/60 px-2 py-1.5 text-center dark:bg-gray-900/40">
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {stats.longestStreak}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">best streak</div>
        </div>
      </div>

      {/* Daily bar chart */}
      {stats.byDay.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
            Daily sessions (last 14 days)
          </div>
          {stats.byDay.map((day) => {
            const workPct = (day.workSeconds / maxDaySeconds) * 100;
            const breakPct = (day.breakSeconds / maxDaySeconds) * 100;
            return (
              <div key={day.date} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {formatDay(day.date)}
                </span>
                <div className="flex-1 flex h-4 rounded overflow-hidden bg-white/40 dark:bg-gray-900/30">
                  {workPct > 0 && (
                    <div
                      className="bg-purple-500 dark:bg-purple-400 transition-all"
                      style={{ width: `${workPct}%` }}
                      title={`Work: ${formatDuration(day.workSeconds)}`}
                    />
                  )}
                  {breakPct > 0 && (
                    <div
                      className="bg-purple-300 dark:bg-purple-700 transition-all"
                      style={{ width: `${breakPct}%` }}
                      title={`Break: ${formatDuration(day.breakSeconds)}`}
                    />
                  )}
                </div>
                <span className="w-12 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {day.sessions}x
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-purple-500 dark:bg-purple-400" />
              Work
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-purple-300 dark:bg-purple-700" />
              Break
            </span>
          </div>
        </div>
      )}

      {/* Completion rate */}
      {stats.totalSessions > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {Math.round((stats.completedSessions / stats.totalSessions) * 100)}% completion rate
          ({stats.completedSessions}/{stats.totalSessions} sessions)
        </div>
      )}
    </div>
  );
});
