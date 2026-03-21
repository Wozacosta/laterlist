"use client";

import { memo } from "react";
import type { Recommendation as RecommendationType } from "@/hooks/useRecommendation";

interface RecommendationProps {
  recommendation: RecommendationType;
}

export const Recommendation = memo(function Recommendation({
  recommendation,
}: RecommendationProps) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 dark:border-blue-900 dark:bg-blue-950">
      {/* Compass icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-blue-500 dark:text-blue-400"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">Next up:</span>{" "}
          <span className="font-semibold text-blue-700 dark:text-blue-300">
            {recommendation.topicName}
          </span>
        </p>
        {recommendation.reason && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {recommendation.reason}
          </p>
        )}
      </div>
    </div>
  );
});
