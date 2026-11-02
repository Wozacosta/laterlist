"use client";

import { memo, useMemo, useState } from "react";
import type { Item } from "@/db";
import { activityByDay, currentStreak, dayKey, monthCells, type DayEntry } from "@/lib/calendar";
import { itemSource } from "@/lib/linkDomain";
import { ItemLink, ItemThumbnail, KindBadge, quietButton, rowTitleClass } from "./ItemRow";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const dayName = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Darker the more that happened, like a contribution graph. */
function cellTint(count: number): string {
  if (count === 0) return "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-900";
  if (count === 1) return "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200";
  if (count <= 3) return "bg-green-300 text-green-950 dark:bg-green-800 dark:text-green-50";
  return "bg-green-600 text-white";
}

/** "2026-11-02" read as a local date, not as midnight UTC. */
function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
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
  now: number;
}

export const CalendarView = memo(function CalendarView({ items, now }: CalendarViewProps) {
  const [monthsBack, setMonthsBack] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const days = useMemo(() => activityByDay(items), [items]);
  const today = dayKey(now);
  const streak = currentStreak(days, now);

  const thisMonth = new Date(now);
  const first = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - monthsBack, 1);
  const cells = monthCells(first.getFullYear(), first.getMonth());

  const inMonth = cells.filter((cell): cell is string => cell !== null);
  const activeDays = inMonth.filter((key) => days.has(key));
  const finished = activeDays.flatMap((key) => days.get(key) ?? []).filter((entry) => entry.finished).length;

  // Opening a month lands on its latest active day, so there's always something to read.
  const selected = picked && inMonth.includes(picked) ? picked : activeDays.at(-1) ?? null;
  const entries = selected ? days.get(selected) ?? [] : [];

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
          monthsBack === 0 && streak > 1 && `${streak}-day streak`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

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
            const count = days.get(key)?.length ?? 0;
            const future = key > today;

            return (
              <button
                key={key}
                type="button"
                disabled={future}
                onClick={() => setPicked(key)}
                aria-pressed={key === selected}
                aria-label={`${dayName.format(fromKey(key))}: ${plural(count, "item")}`}
                className={`relative h-12 rounded-lg text-sm transition-colors disabled:cursor-default disabled:opacity-40 disabled:hover:bg-gray-50 dark:disabled:hover:bg-gray-900/60 md:h-14 ${cellTint(count)} ${
                  key === selected ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <span className={`absolute left-1.5 top-1 text-xs ${key === today ? "font-bold underline" : ""}`}>
                  {fromKey(key).getDate()}
                </span>
                {count > 0 && (
                  <span className="absolute inset-x-0 bottom-1 text-center font-semibold tabular-nums md:bottom-2 md:text-base">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{dayName.format(fromKey(selected))}</h3>
          {entries.length > 0 ? (
            <ul
              aria-label={`Items on ${dayName.format(fromKey(selected))}`}
              className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
            >
              {entries.map((entry) => (
                <DayRow key={entry.item.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing that day.</p>
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nothing done this month.
        </p>
      )}
    </div>
  );
});
