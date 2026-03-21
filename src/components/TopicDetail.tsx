"use client";

import { memo, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Topic, type Item } from "@/db";
import { maxInterval, urgency } from "@/lib/spacedRepetition";

interface TopicDetailProps {
  topic: Topic;
  items: Item[];
  onBack: () => void;
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const TopicDetail = memo(function TopicDetail({
  topic,
  items,
  onBack,
  onMarkDone,
  onUnmarkDone,
}: TopicDetailProps) {
  // Filter items for this topic
  const topicItems = useMemo(() => {
    return items.filter((i) => i.topicIds?.includes(topic.id));
  }, [items, topic.id]);

  const unreadItems = useMemo(
    () => topicItems.filter((i) => i.status === "unread"),
    [topicItems]
  );
  const doneItems = useMemo(
    () => topicItems.filter((i) => i.status === "done"),
    [topicItems]
  );

  const itemRemainingSeconds = useMemo(
    () => unreadItems.reduce((sum, i) => sum + (i.duration ?? 0), 0),
    [unreadItems]
  );

  // Use topic-level estimate when set, otherwise fall back to item-based remaining
  const remainingSeconds = topic.estimatedSeconds && topic.estimatedSeconds > 0
    ? Math.max(0, topic.estimatedSeconds - topic.timeSpent)
    : itemRemainingSeconds;

  const totalEstimated = useMemo(
    () => topicItems.reduce((sum, i) => sum + (i.duration ?? 0), 0),
    [topicItems]
  );

  // Recent time logs for this topic (last 20)
  const recentLogs = useLiveQuery(
    () =>
      db.timeLogs
        .where("topicId")
        .equals(topic.id)
        .reverse()
        .sortBy("loggedAt")
        .then((logs) => logs.slice(0, 20)),
    [topic.id]
  );

  const isCompleted = topic.status === "completed";

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          aria-label="Back to topics"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className={`text-lg font-semibold truncate ${
            isCompleted
              ? "text-gray-400 line-through dark:text-gray-600"
              : "text-gray-900 dark:text-white"
          }`}>
            {topic.name}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Created {formatDate(topic.createdAt)}
            {isCompleted && topic.completedAt && ` · Completed ${formatDate(topic.completedAt)}`}
            {` · P${topic.priority ?? 3}`}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Spent</p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatTime(topic.timeSpent)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Remaining</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {formatTime(remainingSeconds)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Items</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {doneItems.length}/{topicItems.length}
          </p>
        </div>
      </div>

      {/* SR status */}
      {!isCompleted && (() => {
        const priority = topic.priority ?? 3;
        const maxDays = maxInterval(priority);
        const DAY_MS = 86_400_000;
        const now = Date.now();
        const lastDate = topic.lastActivityDate
          ? new Date(topic.lastActivityDate).getTime()
          : new Date(topic.createdAt).getTime();
        const daysSince = Math.max(0, (now - lastDate) / DAY_MS);
        const score = urgency(daysSince, priority);
        const isOverdue = score >= 1.0;
        const nextReviewDate = new Date(lastDate + maxDays * DAY_MS);
        const nextReviewLabel = isOverdue
          ? "Overdue"
          : nextReviewDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

        return (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Review status
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className={`text-sm font-semibold ${
                  isOverdue
                    ? "text-red-600 dark:text-red-400"
                    : score >= 0.7
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400"
                }`}>
                  {score.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Urgency</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {daysSince < 1 ? "<1" : Math.round(daysSince)}d
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Since activity</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {maxDays}d
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Max interval</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                }`}>
                  {nextReviewLabel}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Next review</p>
              </div>
            </div>
            {/* Urgency bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverdue
                    ? "bg-red-500 dark:bg-red-400"
                    : score >= 0.7
                      ? "bg-amber-500 dark:bg-amber-400"
                      : "bg-green-500 dark:bg-green-400"
                }`}
                style={{ width: `${Math.min(100, Math.round(score * 100))}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Progress bar */}
      {totalEstimated > 0 && (
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all"
              style={{ width: `${Math.min(100, Math.round((topic.timeSpent / (topic.timeSpent + remainingSeconds)) * 100))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {topic.timeSpent + remainingSeconds > 0
              ? `${Math.round((topic.timeSpent / (topic.timeSpent + remainingSeconds)) * 100)}% complete`
              : "No estimated time"}
          </p>
        </div>
      )}

      {/* Unread items */}
      {unreadItems.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            To learn ({unreadItems.length})
          </h3>
          <div className="flex flex-col gap-1">
            {unreadItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950"
              >
                <button
                  type="button"
                  onClick={() => onMarkDone(item.id)}
                  className="shrink-0 text-gray-300 hover:text-green-500 dark:text-gray-700 dark:hover:text-green-400"
                  aria-label="Mark done"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400 truncate block"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate block">
                      {item.title}
                    </span>
                  )}
                </div>
                {item.duration && (
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {formatTime(item.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done items */}
      {doneItems.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Completed ({doneItems.length})
          </h3>
          <div className="flex flex-col gap-1">
            {doneItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2 opacity-60 dark:border-gray-900 dark:bg-gray-950"
              >
                <button
                  type="button"
                  onClick={() => onUnmarkDone(item.id)}
                  className="shrink-0 text-green-500 hover:text-gray-400 dark:text-green-400 dark:hover:text-gray-500"
                  aria-label="Unmark done"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </button>
                <span className="min-w-0 flex-1 text-sm text-gray-400 line-through truncate dark:text-gray-600">
                  {item.title}
                </span>
                {item.doneAt && (
                  <span className="shrink-0 text-xs text-gray-300 dark:text-gray-600">
                    {formatDate(item.doneAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {topicItems.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No items assigned to this topic yet
          </p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
            Assign items from the List view
          </p>
        </div>
      )}

      {/* Recent time logs */}
      {recentLogs && recentLogs.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Recent activity
          </h3>
          <div className="flex flex-col gap-0.5">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between px-2 py-1 text-xs"
              >
                <span className="text-gray-400 dark:text-gray-500">
                  {formatDateTime(log.loggedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 ${
                    log.source === "done"
                      ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  }`}>
                    {log.source === "done" ? "completed" : "logged"}
                  </span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {formatTime(log.seconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
