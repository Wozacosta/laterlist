"use client";

import { memo, useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { Item, Topic } from "@/db";
import { useTopicDrop } from "@/hooks/useTopicDrop";
import { itemKind } from "@/lib/itemKind";
import { topicLearned, topicQueue, topicSnoozed } from "@/lib/topicQueue";
import {
  DragPreview,
  formatDate,
  formatDuration,
  gripClass,
  ItemLink,
  ItemThumbnail,
  KindBadge,
  quietButton,
  QuietSelect,
  rowTitleClass,
  StarButton,
  TrashButton,
} from "./ItemRow";
import { TopicIcon } from "./TopicIcon";

const TOPIC_ICONS = [
  "🤖", "🧠", "🏗️", "💾", "🌐", "⌨️", "💻", "🛠️",
  "🔒", "📱", "⚡", "🔌", "🔬", "🧪", "📐", "🧮",
  "📈", "💸", "🏦", "⛓️", "🀄", "🗣️", "✍️", "📚",
  "🎓", "🎨", "🎵", "🎬", "🌍", "🧘", "🏃", "🍳",
];

const SNOOZE_OPTIONS = [
  { label: "Back tomorrow", days: 1 },
  { label: "Back in a week", days: 7 },
];

/** Early on the morning it's due, so an evening session is back the next day. */
function backOn(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(4, 0, 0, 0);
  return date.toISOString();
}

const sectionLabel =
  "cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export interface ItemActions {
  moveTargets: Topic[];
  onMarkDone: (id: string) => void;
  onUnmarkDone: (id: string) => void;
  onDoNext: (id: string) => void;
  onMove: (id: string, topicId: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onToggleStar: (id: string) => void;
  onSnooze: (id: string, until: string | null, message: string) => void;
}

export function DoneABit({ item, onSnooze }: { item: Item } & Pick<ItemActions, "onSnooze">) {
  return (
    <QuietSelect
      aria-label={`Done a bit of "${item.title}"`}
      value=""
      onChange={(e) => {
        const option = SNOOZE_OPTIONS[Number(e.target.value)];
        if (option) onSnooze(item.id, backOn(option.days), option.label);
      }}
    >
      <option value="">Done a bit…</option>
      {SNOOZE_OPTIONS.map((option, index) => (
        <option key={option.days} value={index}>
          {option.label}
        </option>
      ))}
    </QuietSelect>
  );
}

function MoveTo({ item, moveTargets, onMove }: { item: Item } & Pick<ItemActions, "moveTargets" | "onMove">) {
  if (moveTargets.length === 0) return null;

  return (
    <QuietSelect
      aria-label={`Move "${item.title}" to another topic`}
      value=""
      onChange={(e) => e.target.value && onMove(item.id, e.target.value)}
    >
      <option value="">Move to…</option>
      {moveTargets.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.name}
        </option>
      ))}
    </QuietSelect>
  );
}

/** A row in a topic drags onto the sidebar, so the grip is only a cue with no keyboard stop. */
export function Grip() {
  return (
    <span aria-hidden title="Drag onto a topic" className={gripClass}>
      ⠿
    </span>
  );
}

export function ItemDetails({ item }: { item: Item }) {
  return (
    <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <KindBadge item={item} />
      {item.duration != null && <span className="shrink-0">{formatDuration(item.duration, itemKind(item))}</span>}
      {item.progress && <span className="truncate">Stopped at {item.progress}</span>}
    </p>
  );
}

/** Rows in here can be dragged onto a sidebar topic. */
export function ItemDragArea({
  items,
  onDrop,
  children,
}: {
  items: Item[];
  onDrop: (itemId: string, topicId: string) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const topicDrop = useTopicDrop(onDrop);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragging = items.find((item) => item.id === draggingId);

  return (
    <DndContext
      id="topic-items"
      sensors={sensors}
      onDragStart={({ active }) => {
        setDraggingId(String(active.id));
        topicDrop.start();
      }}
      onDragEnd={({ active }) => {
        setDraggingId(null);
        topicDrop.finish(String(active.id));
      }}
      onDragCancel={() => {
        setDraggingId(null);
        topicDrop.cancel();
      }}
    >
      {children}
      <DragOverlay>{dragging && <DragPreview title={dragging.title} />}</DragOverlay>
    </DndContext>
  );
}

export function NextCard({ item, actions }: { item: Item; actions: ItemActions }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <section
      ref={setNodeRef}
      aria-label="Next"
      className={`rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <Grip />
        <ItemThumbnail item={item} className="h-14 w-20 sm:h-20 sm:w-36" />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Next</p>
          <ItemLink
            item={item}
            titleClassName="line-clamp-2 break-words"
            className="text-lg font-semibold leading-snug text-gray-900 dark:text-white"
          />
          <ItemDetails item={item} />
        </div>
      </div>

      {(item.why || item.summary) && (
        <p className="mt-3 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">{item.why || item.summary}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => actions.onMarkDone(item.id)}
          className="mr-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Done
        </button>
        <DoneABit item={item} onSnooze={actions.onSnooze} />
        <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
        <div className="ml-auto flex items-center gap-1">
          <StarButton item={item} onToggle={actions.onToggleStar} />
          <TrashButton item={item} onDelete={actions.onDelete} />
        </div>
      </div>
    </section>
  );
}

function LaterRow({ item, actions }: { item: Item; actions: ItemActions }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
    >
      <div className="flex min-w-0 basis-full items-center gap-3 sm:flex-1 sm:basis-0">
        <Grip />
        <ItemThumbnail item={item} className="h-9 w-16" />

        <div className="min-w-0 flex-1">
          <ItemLink
            item={item}
            titleClassName={rowTitleClass}
            className="text-sm font-medium text-gray-800 dark:text-gray-200"
          />
          <ItemDetails item={item} />
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <StarButton item={item} onToggle={actions.onToggleStar} />
        <button type="button" onClick={() => actions.onDoNext(item.id)} className={quietButton}>
          Do next
        </button>
        <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
        <button type="button" onClick={() => actions.onMarkDone(item.id)} className={quietButton}>
          Done
        </button>
        <TrashButton item={item} onDelete={actions.onDelete} />
      </div>
    </li>
  );
}

function SnoozedRow({ item, actions }: { item: Item; actions: ItemActions }) {
  return (
    <li className="flex items-center gap-2 py-2">
      <KindBadge item={item} />
      <div className="min-w-0 flex-1">
        <ItemLink item={item} titleClassName={rowTitleClass} className="text-sm text-gray-600 dark:text-gray-400" />
      </div>
      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
        {item.progress ? `At ${item.progress} · ` : ""}Back {formatDate(item.snoozedUntil ?? "")}
      </span>
      <button type="button" onClick={() => actions.onSnooze(item.id, null, "Back in the queue")} className={quietButton}>
        Bring back
      </button>
      <TrashButton item={item} onDelete={actions.onDelete} />
    </li>
  );
}

function LearnedRow({ item, actions }: { item: Item; actions: ItemActions }) {
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <KindBadge item={item} />
        <div className="min-w-0 flex-1">
          <ItemLink item={item} titleClassName={rowTitleClass} className="text-sm text-gray-600 dark:text-gray-400" />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <StarButton item={item} onToggle={actions.onToggleStar} />
          <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
          <button type="button" onClick={() => actions.onUnmarkDone(item.id)} className={quietButton}>
            Not done
          </button>
          <TrashButton item={item} onDelete={actions.onDelete} />
        </div>
      </div>
      <textarea
        key={item.notes ?? ""}
        defaultValue={item.notes ?? ""}
        onBlur={(e) => e.target.value !== (item.notes ?? "") && actions.onUpdateNotes(item.id, e.target.value)}
        rows={1}
        aria-label={`Notes on "${item.title}"`}
        placeholder="What did you take from it?"
        className="mt-1 w-full resize-none rounded bg-transparent px-1 py-0.5 text-xs text-gray-600 placeholder-gray-400 field-sizing-content focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-400 dark:placeholder-gray-600"
      />
    </li>
  );
}

function IconPicker({ topic, onChange }: { topic: Topic; onChange: (icon: string | undefined) => void }) {
  const [open, setOpen] = useState(false);

  function choose(icon: string | undefined) {
    onChange(icon);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Change the icon for ${topic.name}`}
        aria-expanded={open}
        title="Change icon"
        className="block rounded-lg transition-transform hover:scale-105"
      >
        <TopicIcon topic={topic} className="size-10 text-xl" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="grid grid-cols-8 gap-0.5">
              {TOPIC_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => choose(icon)}
                  aria-label={`Use ${icon}`}
                  className={`rounded-md py-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    icon === topic.icon ? "bg-gray-200 dark:bg-gray-700" : ""
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            {topic.icon && (
              <button type="button" onClick={() => choose(undefined)} className={`${quietButton} mt-1`}>
                Remove icon
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface TopicViewProps extends Omit<ItemActions, "moveTargets"> {
  topic: Topic;
  topics: Topic[];
  items: Item[];
  now: number;
  onRename: (id: string, name: string) => void;
  onSetIcon: (id: string, icon: string | undefined) => void;
  onSetFocus: (id: string, focus: boolean) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
  onDeleteTopic: (id: string) => void;
  onDropOnTopic: (itemId: string, topicId: string) => void;
}

export const TopicView = memo(function TopicView({
  topic,
  topics,
  items,
  now,
  onRename,
  onSetIcon,
  onSetFocus,
  onComplete,
  onReopen,
  onDeleteTopic,
  onDropOnTopic,
  ...handlers
}: TopicViewProps) {
  const queue = topicQueue(items, topic.id, now);
  const snoozed = topicSnoozed(items, topic.id, now);
  const learned = useMemo(() => topicLearned(items, topic.id), [items, topic.id]);
  const moveTargets = useMemo(
    () => topics.filter((t) => t.status === "active" && t.id !== topic.id),
    [topics, topic.id]
  );

  const actions: ItemActions = { ...handlers, moveTargets };
  const [next, ...later] = queue;

  function rename() {
    const name = window.prompt("Rename topic", topic.name)?.trim();
    if (name) onRename(topic.id, name);
  }

  function remove() {
    if (window.confirm(`Delete "${topic.name}"? Its items stay in All items.`)) {
      onDeleteTopic(topic.id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <IconPicker topic={topic} onChange={(icon) => onSetIcon(topic.id, icon)} />
        <h2 className="min-w-0 flex-1 basis-[calc(100%-3rem)] truncate text-2xl font-bold text-gray-900 sm:basis-0 dark:text-white">
          {topic.name}
        </h2>
        {topic.status === "active" && (
          <button type="button" onClick={() => onSetFocus(topic.id, !topic.focus)} className={quietButton}>
            {topic.focus ? "Move to Later" : "Add to Focus"}
          </button>
        )}
        <button type="button" onClick={rename} className={quietButton}>
          Rename
        </button>
        <button
          type="button"
          onClick={() => (topic.status === "active" ? onComplete(topic.id) : onReopen(topic.id))}
          className={quietButton}
        >
          {topic.status === "active" ? "Complete" : "Reopen"}
        </button>
        <button type="button" onClick={remove} className={quietButton}>
          Delete
        </button>
      </header>

      <ItemDragArea items={queue} onDrop={onDropOnTopic}>
      {next ? (
        <NextCard key={next.id} item={next} actions={actions} />
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {snoozed.length > 0
            ? "Nothing right now. Your snoozed items come back on their dates."
            : "Nothing to learn here yet. Paste a link or type something above."}
        </p>
      )}

      {later.length > 0 && (
        <ul
          aria-label="After that"
          className="-mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
        >
          {later.map((item) => (
            <LaterRow key={item.id} item={item} actions={actions} />
          ))}
        </ul>
      )}

      </ItemDragArea>

      {snoozed.length > 0 && (
        <details>
          <summary className={sectionLabel}>
            Snoozed ({snoozed.length})
          </summary>
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {snoozed.map((item) => (
              <SnoozedRow key={item.id} item={item} actions={actions} />
            ))}
          </ul>
        </details>
      )}

      {learned.length > 0 && (
        <details>
          <summary className={sectionLabel}>
            Learned ({learned.length})
          </summary>
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {learned.map((item) => (
              <LearnedRow key={item.id} item={item} actions={actions} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
});
