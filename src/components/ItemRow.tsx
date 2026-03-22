"use client";

import { memo, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item, Topic } from "@/db";
import { TagChips } from "./TagChips";
import { TopicPicker } from "./TopicPicker";

interface ItemRowProps {
  item: Item;
  topics: Topic[];
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  onAssignTopic: (itemId: string, topicId: string) => void;
  onUnassignTopic: (itemId: string, topicId: string) => void;
}

function formatDuration(seconds: number | undefined, category: string): string {
  if (seconds == null) return "–";
  if (category === "video" || category === "podcast") {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min read`;
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(isoString)
  );
}

export const ItemRow = memo(function ItemRow({
  item,
  topics,
  onMarkDone,
  onUnmarkDone,
  onPublish,
  onUnpublish,
  onUpdateTags,
  onUpdateNotes,
  onDelete,
  onAssignTopic,
  onUnassignTopic,
}: ItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCheckboxChange = useCallback(() => {
    if (item.status === "done") {
      onUnmarkDone(item.id);
    } else {
      onMarkDone(item.id);
    }
  }, [item.id, item.status, onMarkDone, onUnmarkDone]);

  const handleTagRemove = useCallback(
    (tag: string) => {
      onUpdateTags(item.id, item.tags.filter((t) => t !== tag));
    },
    [item.id, item.tags, onUpdateTags]
  );

  const handleTagAdd = useCallback(
    (tag: string) => {
      onUpdateTags(item.id, [...item.tags, tag]);
    },
    [item.id, item.tags, onUpdateTags]
  );

  const handleNotesBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      onUpdateNotes(item.id, e.target.value);
    },
    [item.id, onUpdateNotes]
  );

  const handleAssignTopic = useCallback(
    (topicId: string) => onAssignTopic(item.id, topicId),
    [item.id, onAssignTopic]
  );

  const handleUnassignTopic = useCallback(
    (topicId: string) => onUnassignTopic(item.id, topicId),
    [item.id, onUnassignTopic]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("[data-no-expand]")
      )
        return;
      setExpanded((v) => !v);
    },
    []
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
        item.status === "done" ? "opacity-35" : ""
      }`}
    >
      <div
        onClick={handleRowClick}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
      >
        {/* Drag handle */}
        <button
          type="button"
          className="shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none dark:text-gray-700 dark:hover:text-gray-400"
          style={{ touchAction: "none" }}
          aria-label="Reorder item"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {/* Thumbnail */}
        <div className="shrink-0 h-12 w-12 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs dark:text-gray-600">
              {item.category[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 hover:underline ${item.status === "done" ? "line-through" : ""}`}
            >
              {item.title}
            </a>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TagChips
              tags={item.tags}
              onRemove={handleTagRemove}
              onAdd={handleTagAdd}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="shrink-0 flex flex-col items-end gap-1 text-xs text-gray-400 dark:text-gray-600">
          <span>{formatDuration(item.duration, item.category)}</span>
          <span>{formatDate(item.addedAt)}</span>
        </div>

        {/* Publish toggle (only for done items) */}
        {item.status === "done" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.publishedAt ? onUnpublish(item.id) : onPublish(item.id);
            }}
            className={`shrink-0 text-sm transition-colors ${
              item.publishedAt
                ? "text-green-500 hover:text-green-600 dark:text-green-400"
                : "text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-400"
            }`}
            aria-label={item.publishedAt ? "Unpublish" : "Publish"}
            title={item.publishedAt ? "Published — click to unpublish" : "Publish to reading list"}
          >
            ↗
          </button>
        )}

        {/* Done checkbox */}
        <input
          type="checkbox"
          checked={item.status === "done"}
          onChange={handleCheckboxChange}
          className="shrink-0 h-4 w-4 cursor-pointer accent-blue-600"
          aria-label="Mark as done"
        />

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none dark:text-gray-700 dark:hover:text-red-400"
          aria-label="Delete item"
        >
          ×
        </button>
      </div>

      {/* Notes & Topics (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-800 space-y-2">
          {topics.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">Topics</span>
              <TopicPicker
                topicIds={item.topicIds ?? []}
                topics={topics}
                onAssign={handleAssignTopic}
                onUnassign={handleUnassignTopic}
              />
            </div>
          )}
          <textarea
            defaultValue={item.notes ?? ""}
            onBlur={handleNotesBlur}
            rows={3}
            placeholder="Add a note..."
            className="w-full rounded border border-gray-200 bg-transparent px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none dark:border-gray-700 dark:text-gray-300 dark:placeholder-gray-600"
          />
        </div>
      )}
    </div>
  );
});
