import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Topic } from "@/db";

const WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;

export interface TopicVelocity {
  /** Seconds per day averaged over the last 14 days */
  secsPerDay: number;
  /** Projected completion date, or null if no velocity or no remaining time */
  projectedDate: Date | null;
}

/**
 * Compute learning velocity per topic (seconds/day over 14-day window)
 * and projected completion dates based on remaining time.
 */
export function useVelocity(
  topics: Topic[],
  remainingByTopic: Map<string, number>
) {
  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - WINDOW_DAYS);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const recentLogs = useLiveQuery(
    () => db.timeLogs.where("loggedAt").above(windowStart).toArray(),
    [windowStart]
  );

  const velocityMap = useMemo(() => {
    const map = new Map<string, TopicVelocity>();
    if (!recentLogs) return map;

    // Sum seconds per topic in the window
    const secsMap = new Map<string, number>();
    for (const log of recentLogs) {
      secsMap.set(log.topicId, (secsMap.get(log.topicId) ?? 0) + log.seconds);
    }

    const now = new Date();

    for (const topic of topics) {
      if (topic.status === "completed") continue;

      const totalInWindow = secsMap.get(topic.id) ?? 0;
      const secsPerDay = totalInWindow / WINDOW_DAYS;
      const remaining = remainingByTopic.get(topic.id) ?? 0;

      let projectedDate: Date | null = null;
      if (secsPerDay > 0 && remaining > 0) {
        const daysToComplete = remaining / secsPerDay;
        projectedDate = new Date(now.getTime() + daysToComplete * DAY_MS);
      }

      map.set(topic.id, { secsPerDay, projectedDate });
    }

    return map;
  }, [topics, remainingByTopic, recentLogs]);

  return velocityMap;
}
