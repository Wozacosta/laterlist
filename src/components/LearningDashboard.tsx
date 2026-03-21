"use client";

import { memo, useMemo } from "react";
import type { Topic } from "@/db";
import type { DayActivity } from "@/hooks/useWeeklyActivity";

interface LearningDashboardProps {
  days: DayActivity[];
  topicTotals: Map<string, number>;
  weekTotal: number;
  topics: Topic[];
  streak: number;
  totalVelocitySecsPerDay: number;
  onViewReport: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const TOPIC_COLORS = [
  "bg-blue-500 dark:bg-blue-400",
  "bg-purple-500 dark:bg-purple-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-cyan-500 dark:bg-cyan-400",
  "bg-indigo-500 dark:bg-indigo-400",
  "bg-orange-500 dark:bg-orange-400",
];

const TEXT_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-purple-600 dark:text-purple-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-orange-600 dark:text-orange-400",
];

export const LearningDashboard = memo(function LearningDashboard({
  days,
  topicTotals,
  weekTotal,
  topics,
  streak,
  totalVelocitySecsPerDay,
  onViewReport,
}: LearningDashboardProps) {
  // Build topic color map
  const topicColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const activeTopics = topics.filter((t) => t.status === "active");
    activeTopics.forEach((t, i) => map.set(t.id, i % TOPIC_COLORS.length));
    return map;
  }, [topics]);

  // Allocation: actual time % per topic this week
  const allocation = useMemo(() => {
    if (weekTotal === 0) return [];
    const activeTopics = topics.filter((t) => t.status === "active");
    return activeTopics
      .map((topic) => {
        const secs = topicTotals.get(topic.id) ?? 0;
        const percent = weekTotal > 0 ? Math.round((secs / weekTotal) * 100) : 0;
        return { topic, secs, percent, colorIdx: topicColorMap.get(topic.id) ?? 0 };
      })
      .filter((a) => a.secs > 0)
      .sort((a, b) => b.secs - a.secs);
  }, [topics, topicTotals, weekTotal, topicColorMap]);

  // Max daily seconds for chart scaling
  const maxDay = useMemo(
    () => Math.max(1, ...days.map((d) => d.totalSeconds)),
    [days]
  );

  // Don't render if no data at all
  const hasAnyData = weekTotal > 0 || streak > 0;
  if (!hasAnyData) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      {/* Header with key stats */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">This week</span>
        <div className="flex items-center gap-3 text-xs">
          {weekTotal > 0 && (
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatDuration(weekTotal)}
            </span>
          )}
          {totalVelocitySecsPerDay > 0 && (
            <span className="text-cyan-600 dark:text-cyan-400">
              {formatDuration(Math.round(totalVelocitySecsPerDay))}/d avg
            </span>
          )}
          <button
            type="button"
            onClick={onViewReport}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="View full report"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekly bar chart */}
      {weekTotal > 0 && (
        <div className="mb-3 flex items-end gap-1.5" style={{ height: 48 }}>
          {days.map((day) => {
            const heightPct = day.totalSeconds > 0
              ? Math.max(8, Math.round((day.totalSeconds / maxDay) * 100))
              : 0;
            const isToday = day.dateKey === days[days.length - 1]?.dateKey;
            return (
              <div key={day.dateKey} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full relative rounded-sm overflow-hidden"
                  style={{ height: `${heightPct}%`, minHeight: day.totalSeconds > 0 ? 4 : 0 }}
                  title={`${day.label}: ${formatDuration(day.totalSeconds)}`}
                >
                  {/* Stacked topic colors */}
                  {day.totalSeconds > 0 && (
                    <div className="absolute inset-0 flex flex-col-reverse">
                      {Array.from(day.byTopic.entries()).map(([topicId, secs]) => {
                        const pct = (secs / day.totalSeconds) * 100;
                        const colorIdx = topicColorMap.get(topicId) ?? 0;
                        return (
                          <div
                            key={topicId}
                            className={`${TOPIC_COLORS[colorIdx]} opacity-80`}
                            style={{ height: `${pct}%`, minHeight: 1 }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {day.totalSeconds === 0 && (
                    <div className="h-full w-full rounded-sm bg-gray-100 dark:bg-gray-800" style={{ minHeight: 4 }} />
                  )}
                </div>
                <span className={`text-[10px] ${
                  isToday
                    ? "font-medium text-gray-700 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-600"
                }`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Topic allocation breakdown */}
      {allocation.length > 0 && (
        <div className="space-y-1.5">
          {/* Stacked allocation bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {allocation.map(({ topic, percent, colorIdx }) => (
              <div
                key={topic.id}
                className={`${TOPIC_COLORS[colorIdx]} transition-all`}
                style={{ width: `${percent}%` }}
                title={`${topic.name}: ${percent}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {allocation.map(({ topic, percent, colorIdx }) => {
              const totalPriority = topics.filter((t) => t.status === "active").reduce((sum, t) => sum + (t.priority ?? 3), 0);
              const targetPct = totalPriority > 0 ? Math.round(((topic.priority ?? 3) / totalPriority) * 100) : 0;
              return (
                <span key={topic.id} className="flex items-center gap-1 text-[10px]">
                  <span className={`inline-block h-2 w-2 rounded-sm ${TOPIC_COLORS[colorIdx]}`} />
                  <span className="text-gray-500 dark:text-gray-400">{topic.name}</span>
                  <span className={`font-medium ${TEXT_COLORS[colorIdx]}`}>
                    {percent}%
                  </span>
                  {percent < targetPct && (
                    <span className="text-gray-300 dark:text-gray-600">
                      (target {targetPct}%)
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
