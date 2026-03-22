"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";

interface DailyGoalProps {
  dailyGoalMinutes: number;
  todaySeconds: number;
  streak: number;
  studyStartHour: number;
  studyEndHour: number;
  onSetGoal: (minutes: number) => void;
  onSetStudyHours: (start: number, end: number) => void;
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export const DailyGoal = memo(function DailyGoal({
  dailyGoalMinutes,
  todaySeconds,
  streak,
  studyStartHour,
  studyEndHour,
  onSetGoal,
  onSetStudyHours,
}: DailyGoalProps) {
  const [editing, setEditing] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitGoal = useCallback(() => {
    setEditing(false);
    const val = parseInt(draft, 10);
    if (!isNaN(val) && val >= 0) {
      onSetGoal(val);
    }
  }, [draft, onSetGoal]);

  const todayMinutes = Math.round(todaySeconds / 60);
  const goalSet = dailyGoalMinutes > 0;
  const progressPercent = goalSet
    ? Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))
    : 0;
  const goalMet = goalSet && todayMinutes >= dailyGoalMinutes;

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 ${
      goalMet
        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Sun/target icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={goalMet ? "text-green-500" : "text-amber-500"}>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Today
          </span>

          {todayMinutes > 0 && (
            <span className={`text-sm font-medium ${goalMet ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
              {formatMinutes(todayMinutes)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Streak badge */}
          {streak > 0 && (
            <span
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                streak >= 7
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
              title={`${streak} day streak`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.037 1.952-5.942 3.5-7.674a.75.75 0 0 1 1.216.18C10.572 10.2 11.263 11 12 11c.462 0 .894-.2 1.232-.538a.75.75 0 0 1 1.24.28C15.59 13.638 19 15.634 19 16c0 3.866-3.134 7-7 7Z" />
              </svg>
              {streak}d
            </span>
          )}

          {/* Goal display / edit */}
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="number"
                min="0"
                max="1440"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitGoal();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="w-14 rounded border border-blue-400 bg-white px-2 py-0.5 text-center text-xs text-gray-700 focus:outline-none dark:bg-gray-900 dark:text-gray-300"
              />
              <span className="text-xs text-gray-400">min/day</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(String(dailyGoalMinutes));
                setEditing(true);
              }}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                goalSet
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700"
              }`}
              title="Set daily learning goal"
            >
              {goalSet ? `Goal: ${formatMinutes(dailyGoalMinutes)}` : "Set goal"}
            </button>
          )}
        </div>
      </div>

      {/* Study hours */}
      {editingHours ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Study window:</span>
          <select
            value={studyStartHour}
            onChange={(e) => onSetStudyHours(parseInt(e.target.value, 10), studyEndHour)}
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
          <span className="text-gray-400">–</span>
          <select
            value={studyEndHour}
            onChange={(e) => onSetStudyHours(studyStartHour, parseInt(e.target.value, 10))}
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).filter(h => h > studyStartHour).map(h => (
              <option key={h} value={h}>{formatHour(h === 24 ? 0 : h)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEditingHours(false)}
            className="text-blue-500 hover:text-blue-700"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingHours(true)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          Study hours: {formatHour(studyStartHour)} – {formatHour(studyEndHour)}
        </button>
      )}

      {/* Progress bar */}
      {goalSet && (
        <div className="mt-2">
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                goalMet ? "bg-green-500 dark:bg-green-400" : "bg-amber-500 dark:bg-amber-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{progressPercent}%</span>
            {!goalMet && todayMinutes > 0 && (
              <span>{formatMinutes(dailyGoalMinutes - todayMinutes)} to go</span>
            )}
            {goalMet && (
              <span className="text-green-600 dark:text-green-400">Goal reached!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
