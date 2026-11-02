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
import { timeAgo } from "@/lib/timeAgo";
import { topicLastDone, topicQueue } from "@/lib/topicQueue";
import { CloudSyncButton } from "./CloudSyncButton";
import { DataManager } from "./DataManager";
import { ThemeToggle } from "./ThemeToggle";
import { TopicIcon, topicTint } from "./TopicIcon";

export const TRASH = "trash";
export const NEXT = "next";

const rowClass = (active: boolean) =>
  `flex shrink-0 items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors md:w-full md:py-1 ${
    active
      ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white"
      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
  }`;

const iconSize = "size-6 text-sm md:size-8 md:text-base";
const neutralTint = "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300";

function Count({ value, tint = neutralTint }: { value: number; tint?: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tint}`}>
      {value}
    </span>
  );
}

function NavRow({
  icon,
  label,
  count,
  active,
  onClick,
  className = "",
}: {
  icon: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`${rowClass(active)} ${className}`}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-lg ${neutralTint} ${iconSize}`}>
          {icon}
        </span>
        {label}
      </span>
      {count ? <Count value={count} /> : null}
    </button>
  );
}

function TopicRow({
  topic,
  count,
  lastDone,
  now,
  active,
  onSelect,
}: {
  topic: Topic;
  count: number;
  lastDone: string | undefined;
  now: number;
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
      <span className="flex min-w-0 items-center gap-2.5">
        <TopicIcon topic={topic} className={iconSize} />
        <span className="min-w-0">
          <span className="block truncate">{topic.name}</span>
          <span className="hidden truncate text-xs font-normal text-gray-500 md:block dark:text-gray-400">
            {lastDone ? `Done ${timeAgo(lastDone, now)}` : "Nothing done yet"}
          </span>
        </span>
      </span>
      {count > 0 && <Count value={count} tint={topicTint(topic.id)} />}
    </button>
  );
}

interface SidebarProps {
  topics: Topic[];
  items: Item[];
  now: number;
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
  now,
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
    <aside className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:flex-nowrap md:items-stretch md:gap-4 md:border-b-0 md:border-r dark:border-gray-800">
      <h1 className="flex-1 px-2 text-lg font-bold text-gray-900 md:flex-none dark:text-white">laterlist</h1>

      <nav
        aria-label="Topics"
        className="order-last flex w-full gap-1 overflow-x-auto [scrollbar-width:none] md:order-none md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto"
      >
        <NavRow icon="🎯" label="Next" active={selected === NEXT} onClick={() => onSelect(NEXT)} />
        <NavRow icon="📚" label="All items" count={unread} active={selected === null} onClick={() => onSelect(null)} />

        <DndContext id="topics" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={active.map((topic) => topic.id)} strategy={rectSortingStrategy}>
            {active.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                count={topicQueue(items, topic.id, now).length}
                lastDone={topicLastDone(items, topic.id)}
                now={now}
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
            className="shrink-0 rounded-md px-2 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-400"
          >
            + New topic
          </button>
        )}

        {completed.length > 0 && (
          <details className="hidden md:block">
            <summary className="cursor-pointer px-2 py-1.5 text-sm text-gray-400 dark:text-gray-600">
              Completed ({completed.length})
            </summary>
            {completed.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onSelect(topic.id)}
                className={rowClass(selected === topic.id)}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <TopicIcon topic={topic} className="size-6 text-sm" />
                  <span className="truncate">{topic.name}</span>
                </span>
              </button>
            ))}
          </details>
        )}

        <NavRow
          icon="🗑️"
          label="Trash"
          count={trashCount}
          active={selected === TRASH}
          onClick={() => onSelect(TRASH)}
          className="md:mt-auto"
        />
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <DataManager />
        <ThemeToggle />
        {isLoggedIn && <CloudSyncButton />}
      </div>
    </aside>
  );
});
