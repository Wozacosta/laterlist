"use client";

import { memo, useState, useCallback } from "react";

interface TimeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

interface SuggestionData {
  slots: TimeSlot[];
  provider: string;
  date: string;
  dailyGoalMinutes: number;
  totalFreeMinutes: number;
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

interface CalendarSuggestionsProps {
  dailyGoalMinutes: number;
}

export const CalendarSuggestions = memo(function CalendarSuggestions({
  dailyGoalMinutes,
}: CalendarSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const goal = dailyGoalMinutes > 0 ? dailyGoalMinutes : 30;
      const res = await fetch(`/api/calendar/suggestions?goal=${goal}`);
      const data = await res.json();
      setSuggestions(data);
      setExpanded(true);
    } catch {
      setSuggestions(null);
    }
    setLoading(false);
  }, [dailyGoalMinutes]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={fetchSuggestions}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {loading ? "Finding free time..." : "Suggest learning times"}
      </button>
    );
  }

  if (!suggestions || suggestions.slots.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No free slots found for today
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

  const totalSuggested = suggestions.slots.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Suggested learning times
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-400">
            {formatDuration(totalSuggested)} available
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-1">
        {suggestions.slots.map((slot, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded bg-white/60 px-3 py-1.5 dark:bg-gray-900/40"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formatTime(slot.start)} – {formatTime(slot.end)}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {formatDuration(slot.durationMinutes)}
            </span>
          </div>
        ))}
      </div>

      {suggestions.provider !== "local" && (
        <p className="mt-2 text-xs text-blue-400 dark:text-blue-500">
          Based on {suggestions.provider === "google" ? "Google" : "Proton"} Calendar free time
        </p>
      )}
    </div>
  );
});
