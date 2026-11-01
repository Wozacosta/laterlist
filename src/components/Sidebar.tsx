"use client";

import { memo, useMemo, useState } from "react";
import type { Item, Topic } from "@/db";
import { topicQueue } from "@/lib/topicQueue";
import { CloudSyncButton } from "./CloudSyncButton";
import { DataManager } from "./DataManager";
import { ThemeToggle } from "./ThemeToggle";

const rowClass = (active: boolean) =>
  `flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm transition-colors md:w-full ${
    active
      ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
  }`;

interface SidebarProps {
  topics: Topic[];
  items: Item[];
  selected: string | null;
  isLoggedIn: boolean;
  onSelect: (topicId: string | null) => void;
  onAddTopic: (name: string) => void;
}

export const Sidebar = memo(function Sidebar({
  topics,
  items,
  selected,
  isLoggedIn,
  onSelect,
  onAddTopic,
}: SidebarProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const active = useMemo(() => topics.filter((t) => t.status === "active"), [topics]);
  const completed = useMemo(() => topics.filter((t) => t.status === "completed"), [topics]);
  const unread = useMemo(() => items.filter((i) => i.status === "unread").length, [items]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onAddTopic(trimmed);
    setName("");
    setAdding(false);
  }

  return (
    <aside className="flex flex-col gap-4 border-b border-gray-200 p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r dark:border-gray-800">
      <h1 className="px-3 text-lg font-bold text-gray-900 dark:text-white">laterlist</h1>

      <nav aria-label="Topics" className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-y-auto">
        <button type="button" onClick={() => onSelect(null)} className={rowClass(selected === null)}>
          <span>All items</span>
          <span className="text-xs text-gray-400 dark:text-gray-600">{unread}</span>
        </button>

        {active.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelect(topic.id)}
            aria-current={selected === topic.id ? "page" : undefined}
            className={rowClass(selected === topic.id)}
          >
            <span className="truncate">{topic.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-600">
              {topicQueue(items, topic.id).length}
            </span>
          </button>
        ))}

        {adding ? (
          <form onSubmit={submit} className="shrink-0">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              aria-label="New topic name"
              placeholder="Topic name"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-md px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-400"
          >
            + New topic
          </button>
        )}

        {completed.length > 0 && (
          <details className="hidden md:block">
            <summary className="cursor-pointer px-3 py-1.5 text-sm text-gray-400 dark:text-gray-600">
              Completed ({completed.length})
            </summary>
            {completed.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelect(topic.id)}
                className={rowClass(selected === topic.id)}
              >
                <span className="truncate">{topic.name}</span>
              </button>
            ))}
          </details>
        )}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <DataManager />
        <ThemeToggle />
        {isLoggedIn && <CloudSyncButton />}
      </div>
    </aside>
  );
});
