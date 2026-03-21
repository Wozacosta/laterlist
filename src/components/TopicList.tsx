"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Topic, Item } from "@/db";

interface TopicListProps {
  topics: Topic[];
  items: Item[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const TopicRow = memo(function TopicRow({
  topic,
  remainingSeconds,
  itemCount,
  onRename,
  onDelete,
  onComplete,
  onReopen,
}: {
  topic: Topic;
  remainingSeconds: number;
  itemCount: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== topic.name) {
      onRename(topic.id, trimmed);
    } else {
      setDraft(topic.name);
    }
  }, [draft, topic.id, topic.name, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitRename();
      if (e.key === "Escape") {
        setDraft(topic.name);
        setEditing(false);
      }
    },
    [commitRename, topic.name]
  );

  const isCompleted = topic.status === "completed";

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
      isCompleted
        ? "border-gray-100 bg-gray-50 opacity-60 dark:border-gray-900 dark:bg-gray-950"
        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    }`}>
      {/* Complete/Reopen toggle */}
      <button
        type="button"
        onClick={() => isCompleted ? onReopen(topic.id) : onComplete(topic.id)}
        className={`shrink-0 transition-colors ${
          isCompleted
            ? "text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300"
            : "text-gray-300 hover:text-green-500 dark:text-gray-700 dark:hover:text-green-400"
        }`}
        aria-label={isCompleted ? "Reopen topic" : "Complete topic"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isCompleted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </button>

      {/* Topic icon */}
      <span className={`shrink-0 ${isCompleted ? "text-gray-400 dark:text-gray-600" : "text-blue-500 dark:text-blue-400"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </span>

      {/* Name */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-800 dark:text-gray-200 outline-none border-b border-blue-400"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => {
            setDraft(topic.name);
            setEditing(true);
          }}
          className={`flex-1 min-w-0 text-left text-sm font-medium truncate ${
            isCompleted
              ? "line-through text-gray-400 dark:text-gray-600"
              : "text-gray-800 dark:text-gray-200"
          }`}
          title="Double-click to rename"
        >
          {topic.name}
        </button>
      )}

      {/* Stats + Progress */}
      <div className="shrink-0 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        {(topic.timeSpent > 0 || remainingSeconds > 0) && (
          <div className="flex items-center gap-2">
            {topic.timeSpent > 0 && (
              <span className="text-green-600 dark:text-green-400">{formatTime(topic.timeSpent)}</span>
            )}
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" title={`${topic.timeSpent > 0 ? formatTime(topic.timeSpent) + " done" : ""}${remainingSeconds > 0 ? (topic.timeSpent > 0 ? ", " : "") + formatTime(remainingSeconds) + " left" : ""}`}>
              <div
                className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                style={{ width: `${topic.timeSpent + remainingSeconds > 0 ? Math.round((topic.timeSpent / (topic.timeSpent + remainingSeconds)) * 100) : 0}%` }}
              />
            </div>
            {remainingSeconds > 0 && (
              <span>{formatTime(remainingSeconds)} left</span>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(topic.id)}
        className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-700 dark:hover:text-red-400 transition-colors"
        aria-label="Delete topic"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
    </div>
  );
});

export const TopicList = memo(function TopicList({
  topics,
  items,
  onAdd,
  onRename,
  onDelete,
  onComplete,
  onReopen,
}: TopicListProps) {
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute per-topic stats: item count and remaining unread time
  const topicStats = useMemo(() => {
    const stats = new Map<string, { itemCount: number; remainingSeconds: number }>();
    for (const topic of topics) {
      stats.set(topic.id, { itemCount: 0, remainingSeconds: 0 });
    }
    for (const item of items) {
      for (const topicId of item.topicIds ?? []) {
        const s = stats.get(topicId);
        if (!s) continue;
        s.itemCount++;
        if (item.status === "unread" && item.duration) {
          s.remainingSeconds += item.duration;
        }
      }
    }
    return stats;
  }, [topics, items]);

  // Compute totals across all active topics
  const totals = useMemo(() => {
    let totalSpent = 0;
    let totalRemaining = 0;
    for (const topic of topics) {
      if (topic.status === "completed") continue;
      totalSpent += topic.timeSpent;
      const s = topicStats.get(topic.id);
      totalRemaining += s?.remainingSeconds ?? 0;
    }
    return { totalSpent, totalRemaining };
  }, [topics, topicStats]);

  // Sort: active topics first (preserving sortOrder), completed at bottom
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return 0; // preserve existing sortOrder from DB
    });
  }, [topics]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;
      onAdd(newName.trim());
      setNewName("");
      inputRef.current?.focus();
    },
    [newName, onAdd]
  );

  return (
    <div>
      {/* Add topic input */}
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="New learning topic..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Topics list */}
      {topics.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 text-gray-200 dark:text-gray-800"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No topics yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
            Create a topic to start tracking your learning
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedTopics.map((topic) => {
            const s = topicStats.get(topic.id);
            return (
              <TopicRow
                key={topic.id}
                topic={topic}
                itemCount={s?.itemCount ?? 0}
                remainingSeconds={s?.remainingSeconds ?? 0}
                onRename={onRename}
                onDelete={onDelete}
                onComplete={onComplete}
                onReopen={onReopen}
              />
            );
          })}

          {/* Totals summary */}
          {(totals.totalSpent > 0 || totals.totalRemaining > 0) && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-4 py-2.5 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">All topics</span>
              <div className="flex items-center gap-3 text-xs">
                {totals.totalSpent > 0 && (
                  <span className="text-green-600 dark:text-green-400">{formatTime(totals.totalSpent)} done</span>
                )}
                {(totals.totalSpent > 0 || totals.totalRemaining > 0) && (
                  <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                      style={{ width: `${totals.totalSpent + totals.totalRemaining > 0 ? Math.round((totals.totalSpent / (totals.totalSpent + totals.totalRemaining)) * 100) : 0}%` }}
                    />
                  </div>
                )}
                {totals.totalRemaining > 0 && (
                  <span className="text-gray-400 dark:text-gray-500">{formatTime(totals.totalRemaining)} left</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
