"use client";

import { memo, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item, Topic } from "@/db";
import { itemKind, type ItemKind } from "@/lib/itemKind";
import { itemSource } from "@/lib/linkDomain";
import { NoteImages, noteImageHandlers } from "./NoteImages";
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

const KIND_GLYPHS: Record<ItemKind, string> = {
  YouTube: "▶",
  Tweet: "𝕏",
  Video: "▶",
  Article: "Aa",
  Paper: "§",
  Repo: "</>",
  Podcast: "♪",
  Doc: "≡",
  Action: "✓",
  Link: "↗",
  Note: "✎",
};

/** Saved image links go dead over time, so a failed image falls back to the kind's tile. */
export function Thumbnail({
  src,
  kind,
  className = "h-12 w-16",
}: {
  src?: string;
  kind: ItemKind;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md text-sm font-semibold ${KIND_STYLES[kind]} ${className}`}
    >
      {KIND_GLYPHS[kind]}
    </div>
  );
}

export const gripClass =
  "shrink-0 cursor-grab touch-none text-lg leading-none text-gray-400 hover:text-gray-700 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-300";

export const quietButton =
  "shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200";

/** Titles get two lines on a phone, where one line only fits a few words. */
export const rowTitleClass = "line-clamp-2 break-words sm:line-clamp-1";

export function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function TrashButton({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onDelete(item.id)}
      aria-label={`Move to Trash: ${item.title}`}
      title="Move to Trash"
      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-red-400"
    >
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

export function QuietSelect({ children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative inline-flex shrink-0 text-gray-500 dark:text-gray-400">
      <select
        {...props}
        className="max-w-36 cursor-pointer appearance-none truncate rounded bg-transparent py-1 pl-2 pr-6 text-xs field-sizing-content hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        {children}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
    </span>
  );
}

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

function ItemMeta({ item }: { item: Item }) {
  const details = [
    itemSource(item),
    item.duration != null && formatDuration(item.duration, itemKind(item)),
    formatDate(item.addedAt),
    ...item.tags,
  ].filter(Boolean);

  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
      <KindBadge item={item} />
      <p className="truncate">{details.join(" · ")}</p>
    </div>
  );
}

export function ItemThumbnail({ item, className }: { item: Item; className?: string }) {
  const image = (
    <Thumbnail key={item.thumbnail} src={item.thumbnail} kind={itemKind(item)} className={className} />
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
    opacity: isDragging ? 0.5 : undefined,
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
      if (e.target.value !== (item.notes ?? "")) onUpdateNotes(item.id, e.target.value);
    },
    [item.id, item.notes, onUpdateNotes]
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
      className={`group border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
        item.status === "done" ? "opacity-70" : ""
      }`}
    >
      <div
        onClick={handleRowClick}
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
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
            titleClassName={rowTitleClass}
            className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${item.status === "done" ? "line-through" : ""}`}
          />
          <ItemMeta item={item} />
        </div>

        <StarButton item={item} onToggle={onToggleStar} />

        {/* Done checkbox */}
        <input
          type="checkbox"
          checked={item.status === "done"}
          onChange={handleCheckboxChange}
          className="shrink-0 h-4 w-4 cursor-pointer accent-blue-600"
          aria-label="Mark as done"
        />

        {/* Details */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide details" : "Show details"}
          title={expanded ? "Hide details" : "Show details"}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronIcon className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
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
            key={item.notes ?? ""}
            defaultValue={item.notes ?? ""}
            onBlur={handleNotesBlur}
            {...noteImageHandlers(item.id)}
            aria-label={`Notes on "${item.title}"`}
            rows={3}
            placeholder="Add a note..."
            className="w-full rounded border border-gray-200 bg-transparent px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none dark:border-gray-700 dark:text-gray-300 dark:placeholder-gray-600"
          />
          <NoteImages item={item} editable />
          <div className="flex justify-end gap-1">
            {item.status === "done" && (
              <button
                type="button"
                onClick={() => (item.publishedAt ? onUnpublish(item.id) : onPublish(item.id))}
                className={quietButton}
              >
                {item.publishedAt ? "Remove from reading list" : "Publish to reading list"}
              </button>
            )}
            <button type="button" onClick={() => onDelete(item.id)} className={quietButton}>
              Move to Trash
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
