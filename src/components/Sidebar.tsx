"use client";

import { memo, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item, Topic } from "@/db";
import { reorderTopics } from "@/lib/reorderTopics";
import { topicQueue } from "@/lib/topicQueue";
import { CloudSyncButton } from "./CloudSyncButton";
import { DataManager } from "./DataManager";
import { ThemeToggle } from "./ThemeToggle";

export const TRASH = "trash";

const rowClass = (active: boolean) =>
  `flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm transition-colors md:w-full ${
    active
      ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
  }`;

function TopicRow({
  topic,
  count,
  active,
  onSelect,
}: {
  topic: Topic;
  count: number;
  active: boolean;
  onSelect: (topicId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  return (
    <button
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined,
      }}
      type="button"
      onClick={() => onSelect(topic.id)}
      aria-current={active ? "page" : undefined}
      data-topic-id={topic.id}
      className={`${rowClass(active)} cursor-grab active:cursor-grabbing data-[drop-target]:ring-2 data-[drop-target]:ring-blue-500`}
      {...attributes}
      {...listeners}
    >
      <span className="truncate">{topic.name}</span>
      <span className="text-xs text-gray-400 dark:text-gray-600">{count}</span>
    </button>
  );
}

interface SidebarProps {
  topics: Topic[];
  items: Item[];
  trashCount: number;
  selected: string | null;
  isLoggedIn: boolean;
  onSelect: (topicId: string | null) => void;
  onAddTopic: (name: string) => void;
  onReorderTopics: (updates: Array<{ id: string; sortOrder: number }>) => void;
}

export const Sidebar = memo(function Sidebar({
  topics,
  items,
  trashCount,
  selected,
  isLoggedIn,
  onSelect,
  onAddTopic,
  onReorderTopics,
}: SidebarProps) {
  // Mouse only: on a touch screen the same gesture scrolls the topic row sideways.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    })
  );
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const active = useMemo(() => topics.filter((t) => t.status === "active"), [topics]);
  const completed = useMemo(() => topics.filter((t) => t.status === "completed"), [topics]);
  const unread = useMemo(() => items.filter((i) => i.status === "unread").length, [items]);

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    if (!over) return;
    const updates = reorderTopics(active, String(dragged.id), String(over.id));
    if (updates.length) onReorderTopics(updates);
  }

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

        <DndContext id="topics" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={active.map((topic) => topic.id)} strategy={rectSortingStrategy}>
            {active.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                count={topicQueue(items, topic.id).length}
                active={selected === topic.id}
                onSelect={onSelect}
              />
            ))}
          </SortableContext>
        </DndContext>

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

        <button
          type="button"
          onClick={() => onSelect(TRASH)}
          className={`${rowClass(selected === TRASH)} md:mt-auto`}
        >
          <span>Trash</span>
          {trashCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-600">{trashCount}</span>
          )}
        </button>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <DataManager />
        <ThemeToggle />
        {isLoggedIn && <CloudSyncButton />}
      </div>
    </aside>
  );
});
