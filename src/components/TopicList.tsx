"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import type { Topic } from "@/db";

interface TopicListProps {
  topics: Topic[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const TopicRow = memo(function TopicRow({
  topic,
  onRename,
  onDelete,
}: {
  topic: Topic;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
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

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      {/* Topic icon */}
      <span className="shrink-0 text-blue-500 dark:text-blue-400">
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
          className="flex-1 min-w-0 text-left text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
          title="Double-click to rename"
        >
          {topic.name}
        </button>
      )}

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
  onAdd,
  onRename,
  onDelete,
}: TopicListProps) {
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});
