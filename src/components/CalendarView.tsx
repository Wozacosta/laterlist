"use client";

import { memo, useMemo, useState } from "react";
import type { Item, Topic } from "@/db";
import {
  activityByDay,
  currentStreak,
  dayKey,
  entryTopics,
  monthCells,
  topicCounts,
  type DayEntry,
} from "@/lib/calendar";
import { itemSource } from "@/lib/linkDomain";
import { ItemLink, ItemThumbnail, KindBadge, quietButton, rowTitleClass } from "./ItemRow";
import { TopicIcon } from "./TopicIcon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const dayName = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "2026-11-02" read as a local date, not as midnight UTC. */
function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function TopicMark({ id, topics, className }: { id: string; topics: Topic[]; className: string }) {
  const topic = topics.find((candidate) => candidate.id === id);
  if (topic) return <TopicIcon topic={topic} className={className} />;

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gray-300 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300 ${className}`}
    >
      ?
    </span>
  );
}

function DayTopics({
  ids,
  topics,
  limit,
  className,
}: {
  ids: string[];
  topics: Topic[];
  limit: number;
  className: string;
}) {
  const hidden = ids.length - limit;

  return (
    <span className={`absolute inset-x-0.5 bottom-1 items-center md:gap-0.5 md:px-1 ${className}`}>
      {ids.slice(0, limit).map((id) => (
        <TopicMark key={id} id={id} topics={topics} className="size-4 text-[10px] md:size-6 md:text-sm" />
      ))}
      {hidden > 0 && <span className="text-[10px] font-semibold leading-none">+{hidden}</span>}
    </span>
  );
}

function DayRow({ entry: { item, finished } }: { entry: DayEntry }) {
  const details = [finished ? null : "Done a bit", finished ? null : item.progress, itemSource(item)].filter(Boolean);

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <ItemThumbnail item={item} className="h-9 w-16" />
      <div className="min-w-0 flex-1">
        <ItemLink item={item} titleClassName={rowTitleClass} className="text-sm font-medium text-gray-800 dark:text-gray-200" />
        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <KindBadge item={item} />
          <span className="truncate">{details.join(" · ")}</span>
        </p>
      </div>
    </li>
  );
}

interface CalendarViewProps {
  items: Item[];
  topics: Topic[];
  now: number;
}

export const CalendarView = memo(function CalendarView({ items, topics, now }: CalendarViewProps) {
  const [monthsBack, setMonthsBack] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);

  const days = useMemo(() => activityByDay(items), [items]);
  const known = useMemo(() => new Set(topics.map((topic) => topic.id)), [topics]);
  const today = dayKey(now);
  const streak = currentStreak(days, now);

  const topicName = (id: string) => topics.find((topic) => topic.id === id)?.name ?? "No topic";
  const inTopic = (entry: DayEntry, id: string) => entryTopics(entry.item, known).includes(id);
  const entriesOn = (key: string) =>
    (days.get(key) ?? []).filter((entry) => !topicId || inTopic(entry, topicId));

  const thisMonth = new Date(now);
  const first = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - monthsBack, 1);
  const cells = monthCells(first.getFullYear(), first.getMonth());

  const inMonth = cells.filter((cell): cell is string => cell !== null);
  const activeDays = inMonth.filter((key) => entriesOn(key).length > 0);
  const finished = activeDays.flatMap(entriesOn).filter((entry) => entry.finished).length;

  const monthTopics = topicCounts(inMonth.flatMap((key) => days.get(key) ?? []), known);
  // Keep the chosen topic on show in a month without it, so it can still be turned off.
  const chips =
    topicId && !monthTopics.some(({ id }) => id === topicId)
      ? [...monthTopics, { id: topicId, count: 0 }]
      : monthTopics;

  // Opening a month lands on its latest active day, so there's always something to read.
  const pickable = picked && inMonth.includes(picked) && (!topicId || activeDays.includes(picked));
  const selected = pickable ? picked : activeDays.at(-1) ?? null;
  const entries = selected ? entriesOn(selected) : [];
  const groups = topicCounts(entries, known).filter(({ id }) => !topicId || id === topicId);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
          {monthName.format(first)}
        </h2>
        {monthsBack > 0 && (
          <button type="button" onClick={() => setMonthsBack(0)} className={quietButton}>
            Today
          </button>
        )}
        <button type="button" aria-label="Previous month" onClick={() => setMonthsBack((n) => n + 1)} className={quietButton}>
          ←
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={monthsBack === 0}
          onClick={() => setMonthsBack((n) => n - 1)}
          className={`${quietButton} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          →
        </button>
      </header>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {[
          `${finished} finished`,
          plural(activeDays.length, "active day"),
          monthsBack === 0 && !topicId && streak > 1 && `${streak}-day streak`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {chips.length > 0 && (
        <div role="group" aria-label="Show one topic" className="flex flex-wrap gap-1.5">
          {chips.map(({ id, count }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === topicId}
              onClick={() => {
                setTopicId(id === topicId ? null : id);
                setPicked(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg border py-1 pl-1 pr-2 text-xs font-medium text-gray-700 transition-colors dark:text-gray-200 ${
                id === topicId
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20"
                  : "border-gray-200 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-900"
              }`}
            >
              <TopicMark id={id} topics={topics} className="size-5 text-xs" />
              {topicName(id)}
              <span className="tabular-nums text-gray-400 dark:text-gray-500">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, index) => {
            if (!key) return <span key={`blank-${index}`} />;
            const onDay = entriesOn(key);
            const dayTopics = topicCounts(onDay, known)
              .map(({ id }) => id)
              .filter((id) => !topicId || id === topicId);
            const names = dayTopics.map(topicName).join(", ");

            return (
              <button
                key={key}
                type="button"
                disabled={key > today}
                onClick={() => setPicked(key)}
                aria-pressed={key === selected}
                aria-label={`${dayName.format(fromKey(key))}: ${plural(onDay.length, "item")}${names ? `, ${names}` : ""}`}
                title={names || undefined}
                className={`relative h-12 rounded-lg text-sm transition-colors disabled:cursor-default disabled:opacity-40 md:h-14 ${
                  onDay.length > 0
                    ? "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                    : "bg-gray-50 text-gray-500 enabled:hover:bg-gray-100 dark:bg-gray-900/60 dark:text-gray-400 dark:enabled:hover:bg-gray-900"
                } ${key === selected ? "ring-2 ring-blue-500" : ""}`}
              >
                <span className={`absolute left-1.5 top-0.5 text-xs ${key === today ? "font-bold underline" : ""}`}>
                  {fromKey(key).getDate()}
                </span>
                {onDay.length > 0 && (
                  <span className="absolute right-1.5 top-0.5 text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                    {onDay.length}
                  </span>
                )}
                <DayTopics ids={dayTopics} topics={topics} limit={2} className="flex justify-center md:hidden" />
                <DayTopics ids={dayTopics} topics={topics} limit={3} className="hidden md:flex" />
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{dayName.format(fromKey(selected))}</h3>
          {groups.map(({ id, count }) => (
            <div key={id} className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <TopicMark id={id} topics={topics} className="size-6 text-sm" />
                {topicName(id)}
                <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">{count}</span>
              </h4>
              <ul
                aria-label={topicName(id)}
                className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
              >
                {entries
                  .filter((entry) => inTopic(entry, id))
                  .map((entry) => (
                    <DayRow key={entry.item.id} entry={entry} />
                  ))}
              </ul>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nothing that day.</p>}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {topicId ? `Nothing in ${topicName(topicId)} this month.` : "Nothing done this month."}
        </p>
      )}
    </div>
  );
});
