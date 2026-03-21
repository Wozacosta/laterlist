import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

/** Return YYYY-MM-DD for a Date in local time */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Compute the current consecutive-day learning streak.
 *
 * Rules:
 * - A "learning day" is any calendar day (local time) with ≥1 TimeLog entry.
 * - The streak counts backwards from today (or yesterday if nothing logged today yet).
 * - If nothing was logged today AND nothing yesterday, streak = 0.
 */
export function useStreak() {
  const streak = useLiveQuery(async () => {
    const logs = await db.timeLogs.orderBy("loggedAt").toArray();
    if (logs.length === 0) return 0;

    // Build set of unique learning days
    const days = new Set<string>();
    for (const log of logs) {
      days.add(toDateKey(new Date(log.loggedAt)));
    }

    // Walk backwards from today
    const now = new Date();
    const todayKey = toDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    // Determine starting point
    let startDate: Date;
    if (days.has(todayKey)) {
      startDate = new Date(now);
    } else if (days.has(yesterdayKey)) {
      // Haven't logged today yet, but streak is still alive from yesterday
      startDate = new Date(yesterday);
    } else {
      return 0;
    }

    // Count consecutive days backwards
    let count = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    while (days.has(toDateKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return count;
  }, []);

  return streak ?? 0;
}
