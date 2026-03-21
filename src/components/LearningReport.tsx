"use client";

import { memo, useState, useCallback } from "react";
import type { Topic } from "@/db";
import { useReportData, type ReportPeriod } from "@/hooks/useReportData";
import { exportLearningJSON, exportLearningCSV } from "@/lib/exportLearning";

interface LearningReportProps {
  topics: Topic[];
  onBack: () => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export const LearningReport = memo(function LearningReport({
  topics,
  onBack,
}: LearningReportProps) {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const report = useReportData(topics, period);

  const handleExportJSON = useCallback(async () => {
    try {
      const count = await exportLearningJSON();
      setExportStatus(`Exported ${count} records as JSON`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch {
      setExportStatus("Export failed");
      setTimeout(() => setExportStatus(null), 3000);
    }
  }, []);

  const handleExportCSV = useCallback(async () => {
    try {
      const count = await exportLearningCSV();
      setExportStatus(`Exported ${count} time logs as CSV`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch {
      setExportStatus("Export failed");
      setTimeout(() => setExportStatus(null), 3000);
    }
  }, []);

  const maxDaySecs = Math.max(1, ...report.dailyBreakdown.map((d) => d.seconds));

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Learning Report
          </h2>
        </div>

        {/* Period toggle */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              period === "week"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              period === "month"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {formatTime(report.totalSeconds)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Avg/day</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {formatTime(Math.round(report.avgSecondsPerDay))}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Active days</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {report.daysWithActivity}/{report.daysInPeriod}
          </p>
        </div>
      </div>

      {/* Daily activity chart */}
      {report.totalSeconds > 0 && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Daily activity
          </h3>
          <div className="flex items-end gap-px" style={{ height: 64 }}>
            {report.dailyBreakdown.map((day, i) => {
              const heightPct = day.seconds > 0
                ? Math.max(6, Math.round((day.seconds / maxDaySecs) * 100))
                : 0;
              const isLast = i === report.dailyBreakdown.length - 1;
              // Show labels sparsely for month view
              const showLabel = period === "week" || i % 5 === 0 || isLast;
              return (
                <div key={day.dateKey} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      day.seconds > 0
                        ? "bg-blue-500 dark:bg-blue-400"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: day.seconds > 0 ? 3 : 2 }}
                    title={`${day.label}: ${formatTime(day.seconds)}`}
                  />
                  {showLabel && (
                    <span className={`text-[8px] ${
                      isLast
                        ? "font-medium text-gray-600 dark:text-gray-400"
                        : "text-gray-300 dark:text-gray-700"
                    }`}>
                      {period === "week" ? day.label.split(" ")[0] : day.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic breakdown */}
      {report.topicReports.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Time allocation vs targets
          </h3>
          <div className="flex flex-col gap-3">
            {report.topicReports.map((tr) => (
              <div key={tr.topicId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {tr.topicName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatTime(tr.seconds)}
                    </span>
                    <span className={`font-medium ${
                      Math.abs(tr.drift) > 10
                        ? tr.drift < 0
                          ? "text-red-500 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {tr.percent}%
                    </span>
                  </div>
                </div>
                {/* Bar: actual vs target */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                    style={{ width: `${Math.min(100, tr.percent)}%` }}
                  />
                  {tr.targetPercent > 0 && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500"
                      style={{ left: `${Math.min(100, tr.targetPercent)}%` }}
                      title={`Target: ${tr.targetPercent}% (P${tr.priority})`}
                    />
                  )}
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
                  <span>
                    {tr.drift > 0 ? `+${tr.drift}%` : `${tr.drift}%`} vs target
                  </span>
                  <span>P{tr.priority} (target {tr.targetPercent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {report.totalSeconds === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No learning activity this {period}
          </p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
            Log time or complete items to see your report
          </p>
        </div>
      )}

      {/* Export section */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Export data
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            JSON (full)
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV (time logs)
          </button>
        </div>
        {exportStatus && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">{exportStatus}</p>
        )}
        <p className="mt-2 text-[10px] text-gray-300 dark:text-gray-600">
          JSON includes topics, time logs, items, and summary. CSV includes time log entries.
        </p>
      </div>
    </div>
  );
});
