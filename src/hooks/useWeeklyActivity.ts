import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

const DAY_MS = 86_400_000;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export interface DayActivity {
  dateKey: string;
  label: string; // "Mon", "Tue", etc.
  totalSeconds: number;
  byTopic: Map<string, number>; // topicId -> seconds
}

/**
 * Returns the last 7 days of learning activity from timeLogs,
 * plus per-topic time allocation over those 7 days.
 */
export function useWeeklyActivity() {
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // 7 days including today
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const recentLogs = useLiveQuery(
    () => db.timeLogs.where("loggedAt").above(weekStart).toArray(),
    [weekStart]
  );

  const { days, topicTotals, weekTotal } = useMemo(() => {
    // Initialize 7 days
    const dayMap = new Map<string, DayActivity>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = toDateKey(d);
      dayMap.set(key, {
        dateKey: key,
        label: dayLabel(d),
        totalSeconds: 0,
        byTopic: new Map(),
      });
    }

    const topicTotals = new Map<string, number>();
    let weekTotal = 0;

    if (recentLogs) {
      for (const log of recentLogs) {
        const key = toDateKey(new Date(log.loggedAt));
        const day = dayMap.get(key);
        if (day) {
          day.totalSeconds += log.seconds;
          day.byTopic.set(
            log.topicId,
            (day.byTopic.get(log.topicId) ?? 0) + log.seconds
          );
        }
        topicTotals.set(
          log.topicId,
          (topicTotals.get(log.topicId) ?? 0) + log.seconds
        );
        weekTotal += log.seconds;
      }
    }

    return {
      days: Array.from(dayMap.values()),
      topicTotals,
      weekTotal,
    };
  }, [recentLogs]);

  return { days, topicTotals, weekTotal, isLoading: recentLogs === undefined };
}
