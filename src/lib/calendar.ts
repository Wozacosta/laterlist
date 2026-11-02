import type { Item } from "@/db";

export interface DayEntry {
  item: Item;
  finished: boolean;
}

/** The local calendar day, so an evening session stays on the day it happened. */
export function dayKey(time: string | number | Date): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** What was finished or worked on each day. An item shows once a day, and finishing it wins. */
export function activityByDay(items: Item[]): Map<string, DayEntry[]> {
  const days = new Map<string, DayEntry[]>();

  function add(time: string, item: Item, finished: boolean) {
    const key = dayKey(time);
    const entries = days.get(key) ?? [];
    if (entries.some((entry) => entry.item.id === item.id)) return;
    days.set(key, [...entries, { item, finished }]);
  }

  for (const item of items) {
    if (item.status === "done" && item.doneAt) add(item.doneAt, item, true);
    for (const time of item.workedOn ?? []) add(time, item, false);
  }

  for (const entries of days.values()) entries.sort((a, b) => Number(b.finished) - Number(a.finished));
  return days;
}

/** Every day of a month, Monday first, with blanks before the 1st so the columns line up. */
export function monthCells(year: number, month: number): (string | null)[] {
  const blanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length }, (_, index) => dayKey(new Date(year, month, index + 1)));
  return [...Array<null>(blanks).fill(null), ...days];
}

/** Days in a row up to today. Today doesn't break it until the day is over. */
export function currentStreak(days: Map<string, DayEntry[]>, now: number): number {
  const today = new Date(now);
  const date = (offset: number) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset));

  let offset = days.has(date(0)) ? 0 : 1;
  let streak = 0;
  while (days.has(date(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}
