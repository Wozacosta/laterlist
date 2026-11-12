"use client";

import { memo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Item, Topic } from "@/db";
import { pickRecall } from "@/lib/recall";
import { nextByTopic } from "@/lib/topicQueue";
import { ItemLink, ItemThumbnail, quietButton, rowTitleClass, StarButton, TrashButton } from "./ItemRow";
import { NoteImages } from "./NoteImages";
import { DoneABit, Grip, ItemDetails, ItemDragArea, NextCard, type ItemActions } from "./TopicView";

function TopicName({ topic, onOpen }: { topic: Topic; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(topic.id)}
      className="block max-w-full self-start truncate text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
    >
      {topic.name}
    </button>
  );
}

function NextRow({
  topic,
  item,
  actions,
  onOpenTopic,
}: {
  topic: Topic;
  item: Item;
  actions: ItemActions;
  onOpenTopic: (id: string) => void;
}) {
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
          <TopicName topic={topic} onOpen={onOpenTopic} />
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
        <DoneABit item={item} onSnooze={actions.onSnooze} />
        <button type="button" onClick={() => actions.onMarkDone(item.id)} className={quietButton}>
          Done
        </button>
        <TrashButton item={item} onDelete={actions.onDelete} />
      </div>
    </li>
  );
}

function RecallCard({ item, onRecall }: { item: Item; onRecall: (id: string, text: string) => void }) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <section aria-label="Recall" className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        What do you remember?
      </p>
      <div className="mt-1">
        <ItemLink item={item} titleClassName={rowTitleClass} className="text-sm font-medium text-gray-800 dark:text-gray-200" />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        aria-label={`What you remember about "${item.title}"`}
        placeholder="From memory, before you look anything up"
        className="mt-2 w-full resize-none rounded border border-gray-200 bg-transparent px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:text-gray-300 dark:placeholder-gray-600"
      />
      {revealed && item.notes && (
        <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">{item.notes}</p>
      )}
      {revealed && (
        <div className="mt-2">
          <NoteImages item={item} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-1">
        <button type="button" onClick={() => onRecall(item.id, text)} className={quietButton}>
          {text.trim() ? "Save" : "Skip"}
        </button>
        {Boolean(item.notes || item.noteImages?.length) && !revealed && (
          <button type="button" onClick={() => setRevealed(true)} className={quietButton}>
            Show my note
          </button>
        )}
      </div>
    </section>
  );
}

interface NextViewProps extends Omit<ItemActions, "moveTargets" | "onMove"> {
  topics: Topic[];
  items: Item[];
  now: number;
  noTopicCount: number;
  onOpenTopic: (id: string) => void;
  onOpenNoTopic: () => void;
  onRecall: (id: string, text: string) => void;
  onDropOnTopic: (itemId: string, topicId: string) => void;
}

export const NextView = memo(function NextView({
  topics,
  items,
  now,
  noTopicCount,
  onOpenTopic,
  onOpenNoTopic,
  onRecall,
  onDropOnTopic,
  ...handlers
}: NextViewProps) {
  const rows = nextByTopic(topics, items, now);
  const [first, ...rest] = rows;
  const recall = pickRecall(items, now);
  const actions: ItemActions = { ...handlers, moveTargets: [], onMove: () => {} };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Next</h2>

      <ItemDragArea items={rows.map((row) => row.item)} onDrop={onDropOnTopic}>
        {first ? (
          <div className="flex flex-col gap-1">
            <TopicName topic={first.topic} onOpen={onOpenTopic} />
            <NextCard key={first.item.id} item={first.item} actions={actions} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Nothing queued. Paste a link above, or open a topic.
          </p>
        )}

        {rest.length > 0 && (
          <ul
            aria-label="Next in other topics"
            className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
          >
            {rest.map(({ topic, item }) => (
              <NextRow key={item.id} topic={topic} item={item} actions={actions} onOpenTopic={onOpenTopic} />
            ))}
          </ul>
        )}
      </ItemDragArea>

      {recall && <RecallCard key={recall.id} item={recall} onRecall={onRecall} />}

      {noTopicCount > 0 && (
        <button type="button" onClick={onOpenNoTopic} className={`${quietButton} self-start`}>
          {noTopicCount} item{noTopicCount !== 1 ? "s" : ""} with no topic
        </button>
      )}
    </div>
  );
});
