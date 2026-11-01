"use client";

import { memo, useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { Item, Topic } from "@/db";
import { useTopicDrop } from "@/hooks/useTopicDrop";
import { itemKind } from "@/lib/itemKind";
import { topicLearned, topicQueue, topicSnoozed } from "@/lib/topicQueue";
import { DragPreview, formatDate, formatDuration, gripClass, ItemLink, ItemThumbnail, KindBadge, StarButton } from "./ItemRow";

const DAY_MS = 24 * 60 * 60 * 1000;

const SNOOZE_OPTIONS = [
  { label: "Back tomorrow", days: 1 },
  { label: "Back in a week", days: 7 },
];

const quietButton =
  "rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200";

interface ItemActions {
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

function DoneABit({ item, onSnooze }: { item: Item } & Pick<ItemActions, "onSnooze">) {
  return (
    <select
      aria-label={`Done a bit of "${item.title}"`}
      value=""
      onChange={(e) => {
        const option = SNOOZE_OPTIONS[Number(e.target.value)];
        if (option) onSnooze(item.id, new Date(Date.now() + option.days * DAY_MS).toISOString(), option.label);
      }}
      className="max-w-28 rounded bg-transparent px-1 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      <option value="">Done a bit…</option>
      {SNOOZE_OPTIONS.map((option, index) => (
        <option key={option.days} value={index}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MoveTo({ item, moveTargets, onMove }: { item: Item } & Pick<ItemActions, "moveTargets" | "onMove">) {
  if (moveTargets.length === 0) return null;

  return (
    <select
      aria-label={`Move "${item.title}" to another topic`}
      value=""
      onChange={(e) => e.target.value && onMove(item.id, e.target.value)}
      className="max-w-28 rounded bg-transparent px-1 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      <option value="">Move to…</option>
      {moveTargets.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.name}
        </option>
      ))}
    </select>
  );
}

/** A row in a topic drags onto the sidebar, so the grip is only a cue with no keyboard stop. */
function Grip() {
  return (
    <span aria-hidden title="Drag onto a topic" className={gripClass}>
      ⠿
    </span>
  );
}

function ItemDetails({ item }: { item: Item }) {
  return (
    <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <KindBadge item={item} />
      {item.duration != null && formatDuration(item.duration, itemKind(item))}
    </p>
  );
}

function NextCard({ item, actions }: { item: Item; actions: ItemActions }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <section
      ref={setNodeRef}
      aria-label="Next"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...listeners}
    >
      <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
      <Grip />
      <ItemThumbnail item={item} className="h-14 w-24" />

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Next</p>
        <ItemLink
          item={item}
          titleClassName="line-clamp-2 break-words"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        />
        <ItemDetails item={item} />
        {(item.why || item.summary) && (
          <p className="mt-1 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">{item.why || item.summary}</p>
        )}
      </div>

      </div>

      <div className="flex shrink-0 items-center gap-1">
        <StarButton item={item} onToggle={actions.onToggleStar} />
        <button
          type="button"
          onClick={() => actions.onMarkDone(item.id)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Done
        </button>
        <DoneABit item={item} onSnooze={actions.onSnooze} />
        <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
        <button type="button" onClick={() => actions.onDelete(item.id)} className={quietButton}>
          Delete
        </button>
      </div>
    </section>
  );
}

function LaterRow({ item, actions }: { item: Item; actions: ItemActions }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...listeners}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Grip />
        <ItemThumbnail item={item} className="hidden h-9 w-16 sm:block" />

        <div className="min-w-0 flex-1">
          <ItemLink item={item} className="text-[15px] font-medium text-gray-800 dark:text-gray-200" />
          <ItemDetails item={item} />
        </div>
      </div>
      <StarButton item={item} onToggle={actions.onToggleStar} />
      <button type="button" onClick={() => actions.onDoNext(item.id)} className={quietButton}>
        Do next
      </button>
      <div className="hidden sm:block">
        <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
      </div>
      <button type="button" onClick={() => actions.onMarkDone(item.id)} className={quietButton}>
        Done
      </button>
    </li>
  );
}

function SnoozedRow({ item, actions }: { item: Item; actions: ItemActions }) {
  return (
    <li className="flex items-center gap-2 py-2">
      <KindBadge item={item} />
      <div className="min-w-0 flex-1">
        <ItemLink item={item} className="text-sm text-gray-600 dark:text-gray-400" />
      </div>
      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-600">
        Back {formatDate(item.snoozedUntil ?? "")}
      </span>
      <button type="button" onClick={() => actions.onSnooze(item.id, null, "Back in the queue")} className={quietButton}>
        Bring back
      </button>
    </li>
  );
}

function LearnedRow({ item, actions }: { item: Item; actions: ItemActions }) {
  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <StarButton item={item} onToggle={actions.onToggleStar} />
        <KindBadge item={item} />
        <div className="min-w-0 flex-1">
          <ItemLink item={item} className="text-sm text-gray-600 dark:text-gray-400" />
        </div>
        <div className="hidden sm:block">
          <MoveTo item={item} moveTargets={actions.moveTargets} onMove={actions.onMove} />
        </div>
        <button type="button" onClick={() => actions.onUnmarkDone(item.id)} className={quietButton}>
          Not done
        </button>
      </div>
      <textarea
        key={item.notes ?? ""}
        defaultValue={item.notes ?? ""}
        onBlur={(e) => e.target.value !== (item.notes ?? "") && actions.onUpdateNotes(item.id, e.target.value)}
        rows={1}
        aria-label={`Notes on "${item.title}"`}
        placeholder="What did you take from it?"
        className="mt-1 w-full resize-y rounded bg-transparent px-1 py-0.5 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-400 dark:placeholder-gray-600"
      />
    </li>
  );
}

interface TopicViewProps extends Omit<ItemActions, "moveTargets"> {
  topic: Topic;
  topics: Topic[];
  items: Item[];
  onRename: (id: string, name: string) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
  onDeleteTopic: (id: string) => void;
  onDropOnTopic: (itemId: string, topicId: string) => void;
}

export const TopicView = memo(function TopicView({
  topic,
  topics,
  items,
  onRename,
  onComplete,
  onReopen,
  onDeleteTopic,
  onDropOnTopic,
  ...handlers
}: TopicViewProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const topicDrop = useTopicDrop(onDropOnTopic);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Not memoized: a snoozed item comes back when its time passes, not when the items change.
  const queue = topicQueue(items, topic.id);
  const snoozed = topicSnoozed(items, topic.id);
  const learned = useMemo(() => topicLearned(items, topic.id), [items, topic.id]);
  const moveTargets = useMemo(
    () => topics.filter((t) => t.status === "active" && t.id !== topic.id),
    [topics, topic.id]
  );

  const actions: ItemActions = { ...handlers, moveTargets };
  const [next, ...later] = queue;
  const dragging = queue.find((item) => item.id === draggingId);

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
      <header className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold text-gray-900 dark:text-white">{topic.name}</h2>
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
      {next ? (
        <NextCard item={next} actions={actions} />
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {snoozed.length > 0
            ? "Nothing right now. Your snoozed items come back on their dates."
            : "Nothing to learn here yet. Paste a link or type something above."}
        </p>
      )}

      {later.length > 0 && (
        <ul aria-label="After that" className="-mt-4 flex flex-col gap-2">
          {later.map((item) => (
            <LaterRow key={item.id} item={item} actions={actions} />
          ))}
        </ul>
      )}

      <DragOverlay>{dragging && <DragPreview title={dragging.title} />}</DragOverlay>
      </DndContext>

      {snoozed.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
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
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
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
