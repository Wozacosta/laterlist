"use client";

import { memo, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item, Topic } from "@/db";
import { itemKind, type ItemKind } from "@/lib/itemKind";
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
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignTopic: (itemId: string, topicId: string) => void;
  onUnassignTopic: (itemId: string, topicId: string) => void;
}

const WATCHED_KINDS: ItemKind[] = ["YouTube", "Video", "Podcast"];

const KIND_STYLES: Record<ItemKind, string> = {
  YouTube: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Tweet: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
  Video: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Article: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Paper: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Repo: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  Podcast: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Doc: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Action: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Link: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  Note: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export function KindBadge({ item }: { item: Item }) {
  const kind = itemKind(item);

  return (
    <span className={`shrink-0 rounded px-1.5 text-[11px] font-medium leading-4 ${KIND_STYLES[kind]}`}>
      {kind}
    </span>
  );
}

export function StarButton({ item, onToggle }: { item: Item; onToggle: (id: string) => void }) {
  const label = item.starred ? "Remove star" : "Star";

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      aria-pressed={item.starred === true}
      aria-label={`${label}: ${item.title}`}
      title={label}
      className={`shrink-0 text-lg leading-none ${
        item.starred
          ? "text-amber-400 hover:text-amber-500"
          : "text-gray-300 hover:text-amber-400 dark:text-gray-600"
      }`}
    >
      {item.starred ? "★" : "☆"}
    </button>
  );
}

export function formatDuration(seconds: number, kind: ItemKind): string {
  if (WATCHED_KINDS.includes(kind)) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min read`;
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(isoString)
  );
}

/** Saved image links go dead over time, so a failed image falls back to the letter. */
export function Thumbnail({
  src,
  category,
  className = "h-12 w-12",
}: {
  src?: string;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800 ${className}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs dark:text-gray-600">
          {category[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

export const gripClass =
  "shrink-0 cursor-grab touch-none text-lg leading-none text-gray-400 hover:text-gray-700 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-300";

export function DragPreview({ title }: { title: string }) {
  return (
    <div className="w-fit max-w-56 truncate rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 opacity-90 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
      {title}
    </div>
  );
}

/** Only the words are the link, so the empty space beside them can do something else. */
export function ItemLink({
  item,
  className,
  titleClassName = "truncate",
}: {
  item: Item;
  className: string;
  titleClassName?: string;
}) {
  const title = <span className={titleClassName}>{item.title}</span>;

  if (!item.url) return <span className={`flex min-w-0 ${className}`}>{title}</span>;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      className={`group/link inline-flex max-w-full items-baseline gap-1 hover:text-blue-600 hover:underline dark:hover:text-blue-400 ${className}`}
    >
      {title}
      <span aria-hidden className="shrink-0 text-xs text-gray-400 group-hover/link:text-blue-600 dark:text-gray-600 dark:group-hover/link:text-blue-400">
        ↗
      </span>
    </a>
  );
}

export function ItemThumbnail({ item, className }: { item: Item; className?: string }) {
  const image = (
    <Thumbnail key={item.thumbnail} src={item.thumbnail} category={item.category} className={className} />
  );

  if (!item.url) return image;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      tabIndex={-1}
      aria-hidden
      className="shrink-0 hover:opacity-80"
    >
      {image}
    </a>
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
  onToggleStar,
  onDelete,
  onAssignTopic,
  onUnassignTopic,
}: ItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
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
        {...listeners}
      >
        {/* Drag handle: the whole row drags, this shows it */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          className={gripClass}
          aria-label="Drag to reorder, or onto a topic"
          title="Drag to reorder, or onto a topic"
          {...attributes}
        >
          ⠿
        </button>

        <ItemThumbnail item={item} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <ItemLink
            item={item}
            className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${item.status === "done" ? "line-through" : ""}`}
          />
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <KindBadge item={item} />
            {item.tags.length > 0 && (
              <p className="truncate text-xs text-gray-400 dark:text-gray-600">
                {item.tags.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="shrink-0 flex flex-col items-end gap-1 text-xs text-gray-400 dark:text-gray-600">
          {item.duration != null && <span>{formatDuration(item.duration, itemKind(item))}</span>}
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

        <StarButton item={item} onToggle={onToggleStar} />

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
          aria-label="Move to Trash"
          title="Move to Trash"
        >
          ×
        </button>

        {/* Details */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide details" : "Show details"}
          title={expanded ? "Hide details" : "Show details"}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Summary, Topics, Tags & Notes (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-800 space-y-2">
          {item.summary && (
            <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{item.summary}</p>
          )}
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">Tags</span>
            <div className="flex flex-wrap items-center gap-2">
              <TagChips tags={item.tags} onRemove={handleTagRemove} onAdd={handleTagAdd} />
            </div>
          </div>
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
