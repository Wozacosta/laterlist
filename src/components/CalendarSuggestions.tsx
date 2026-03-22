"use client";

import { memo, useState, useCallback } from "react";

interface DayPlan {
  date: string;
  dayLabel: string;
  topicName: string;
  topicId: string;
  slot: { start: string; end: string; durationMinutes: number } | null;
}

interface StudyQueueTopic {
  topicId: string;
  topicName: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface CalendarSuggestionsProps {
  dailyGoalMinutes: number;
  studyQueue: StudyQueueTopic[];
}

export const CalendarSuggestions = memo(function CalendarSuggestions({
  dailyGoalMinutes,
  studyQueue,
}: CalendarSuggestionsProps) {
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchWeekPlan = useCallback(async () => {
    if (studyQueue.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const goal = dailyGoalMinutes > 0 ? dailyGoalMinutes : 60;
      const topicIds = studyQueue.map((t) => t.topicId).join(",");
      const topicNames = studyQueue.map((t) => t.topicName).join(",");
      const res = await fetch(
        `/api/calendar/week-plan?goal=${goal}&topics=${encodeURIComponent(topicIds)}&names=${encodeURIComponent(topicNames)}`
      );
      const data = await res.json();
      setDays(data.days ?? []);
    } catch {
      setDays(null);
    }
    setLoading(false);
  }, [dailyGoalMinutes, studyQueue]);

  const pushToCalendar = useCallback(async () => {
    if (!days) return;
    const schedulable = days.filter((d) => d.slot);
    if (schedulable.length === 0) return;

    setPushing(true);
    setResult(null);
    try {
      const res = await fetch("/api/calendar/week-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: schedulable }),
      });
      const data = await res.json();
      if (data.ok && data.created > 0) {
        setResult(`Added ${data.created} learning blocks to your calendar`);
      } else if (data.ok && data.created === 0) {
        // All pushes failed — show first error
        const firstError = data.results?.find((r: { ok: boolean; error?: string }) => !r.ok);
        setResult(firstError?.error || "Failed to create calendar events — check your calendar connection");
      } else {
        setResult(data.error || "Failed to push to calendar");
      }
    } catch {
      setResult("Failed to push to calendar");
    }
    setPushing(false);
  }, [days]);

  if (studyQueue.length === 0) return null;

  // Initial state — show button
  if (!days) {
    return (
      <button
        type="button"
        onClick={fetchWeekPlan}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {loading ? "Planning your week..." : "Plan my learning week"}
      </button>
    );
  }

  const schedulable = days.filter((d) => d.slot);
  const totalMinutes = schedulable.reduce((sum, d) => sum + (d.slot?.durationMinutes ?? 0), 0);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Week learning plan
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400">
            {formatDuration(totalMinutes)} across {schedulable.length} days
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDays(null)}
          className="text-xs text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            className={`flex items-center justify-between rounded px-3 py-2 ${
              day.slot
                ? "bg-white/60 dark:bg-gray-900/40"
                : "bg-gray-100/50 dark:bg-gray-800/30 opacity-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-12 text-xs font-medium text-gray-500 dark:text-gray-400">
                {day.dayLabel} {formatDate(day.date).split(" ")[1]}
              </span>
              <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                {day.topicName}
              </span>
            </div>
            <div className="text-right">
              {day.slot ? (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {formatTime(day.slot.start)} – {formatTime(day.slot.end)}
                  <span className="ml-1.5 text-blue-400 dark:text-blue-500">
                    ({formatDuration(day.slot.durationMinutes)})
                  </span>
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">no free slot</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <p className={`mt-2 text-xs ${result.startsWith("Added") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
          {result}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-blue-400 dark:text-blue-500">
          Based on your calendar free time
        </p>
        {schedulable.length > 0 && !result?.startsWith("Added") && (
          <button
            type="button"
            onClick={pushToCalendar}
            disabled={pushing}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {pushing ? "Scheduling..." : `Set ${schedulable.length} events`}
          </button>
        )}
      </div>
    </div>
  );
});
