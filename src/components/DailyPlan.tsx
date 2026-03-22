"use client";

import { memo } from "react";
import type { DailyRecommendation } from "@/hooks/useDailyPlan";

function formatTime(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const PRIORITY_COLORS: Record<number, string> = {
  5: "text-red-600 dark:text-red-400",
  4: "text-orange-600 dark:text-orange-400",
  3: "text-yellow-600 dark:text-yellow-400",
  2: "text-blue-600 dark:text-blue-400",
  1: "text-gray-500 dark:text-gray-400",
};

interface DailyPlanProps {
  recommendations: DailyRecommendation[];
  onSelectTopic: (topicId: string) => void;
}

export const DailyPlan = memo(function DailyPlan({
  recommendations,
  onSelectTopic,
}: DailyPlanProps) {
  if (recommendations.length === 0) return null;

  const totalMinutes = recommendations.reduce(
    (sum, r) => sum + r.suggestedMinutes,
    0
  );

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Today&apos;s learning plan
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ~{totalMinutes}m suggested
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {recommendations.map((rec) => (
          <button
            key={rec.topicId}
            type="button"
            onClick={() => onSelectTopic(rec.topicId)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800 dark:hover:bg-blue-950"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {rec.topicName}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-bold ${
                      PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS[3]
                    }`}
                  >
                    P{rec.priority}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {rec.rationale}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {rec.suggestedMinutes}m
              </span>
            </div>

            {/* Suggested items */}
            {rec.suggestedItems.length > 0 && (
              <div className="mt-2 flex flex-col gap-0.5">
                {rec.suggestedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    <span className="shrink-0 text-gray-300 dark:text-gray-600">
                      &#x25CB;
                    </span>
                    <span className="truncate">{item.title}</span>
                    {item.duration ? (
                      <span className="shrink-0 text-gray-300 dark:text-gray-600">
                        {formatTime(item.duration)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
