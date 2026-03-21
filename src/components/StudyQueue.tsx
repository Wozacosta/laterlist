"use client";

import { memo } from "react";
import type { StudyQueueEntry } from "@/hooks/useStudyQueue";

interface StudyQueueProps {
  entries: StudyQueueEntry[];
  onMarkStudied: (topicId: string) => void;
  onSelectTopic: (topicId: string) => void;
}

function urgencyColor(score: number, isOverdue: boolean): string {
  if (isOverdue) return "text-red-600 dark:text-red-400";
  if (score >= 0.7) return "text-amber-600 dark:text-amber-400";
  if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function urgencyBg(isOverdue: boolean): string {
  if (isOverdue)
    return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950";
  return "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950";
}

function urgencyBarWidth(score: number): number {
  return Math.min(100, Math.round(score * 100));
}

function urgencyBarColor(score: number): string {
  if (score >= 1.0) return "bg-red-500 dark:bg-red-400";
  if (score >= 0.7) return "bg-amber-500 dark:bg-amber-400";
  if (score >= 0.4) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-green-500 dark:bg-green-400";
}

export const StudyQueue = memo(function StudyQueue({
  entries,
  onMarkStudied,
  onSelectTopic,
}: StudyQueueProps) {
  if (entries.length === 0) return null;

  const overdueCount = entries.filter((e) => e.isOverdue).length;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Study queue
          </h3>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900 dark:text-red-400">
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {entries.map((entry, idx) => (
          <div
            key={entry.topicId}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${urgencyBg(entry.isOverdue)}`}
          >
            {/* Rank */}
            <span className="shrink-0 text-xs font-medium text-gray-300 dark:text-gray-600 w-4 text-center">
              {idx + 1}
            </span>

            {/* Topic name + reason */}
            <button
              type="button"
              onClick={() => onSelectTopic(entry.topicId)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {entry.topicName}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {entry.reason}
              </p>
            </button>

            {/* Priority badge */}
            <span className={`shrink-0 text-[10px] font-medium rounded px-1 py-0.5 ${
              entry.priority >= 4
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : entry.priority === 3
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              P{entry.priority}
            </span>

            {/* Urgency bar + score */}
            <div className="shrink-0 w-16 flex flex-col items-end gap-0.5">
              <span className={`text-[11px] font-semibold ${urgencyColor(entry.urgencyScore, entry.isOverdue)}`}>
                {entry.urgencyScore.toFixed(1)}
              </span>
              <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${urgencyBarColor(entry.urgencyScore)}`}
                  style={{ width: `${urgencyBarWidth(entry.urgencyScore)}%` }}
                />
              </div>
            </div>

            {/* Mark studied button */}
            <button
              type="button"
              onClick={() => onMarkStudied(entry.topicId)}
              className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 transition-colors"
              title="Mark as studied (resets review timer)"
            >
              Studied
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
