import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Topic, type Item } from "@/db";

export interface Recommendation {
  topicId: string;
  topicName: string;
  reason: string;
  score: number;
}

/**
 * Recommend which topic to learn next based on:
 * 1. Priority drift — under-served topics (high priority but low actual time share)
 * 2. Recency — topics not worked on recently
 * 3. Actionability — topics that have unread items
 */
export function useRecommendation(topics: Topic[], items: Item[]) {
  const timeLogs = useLiveQuery(() => db.timeLogs.toArray());

  const recommendation = useMemo<Recommendation | null>(() => {
    if (!timeLogs) return null;

    const activeTopics = topics.filter((t) => t.status === "active");
    if (activeTopics.length === 0) return null;

    // Total time spent across all active topics
    const totalSpent = activeTopics.reduce((sum, t) => sum + t.timeSpent, 0);

    // Last log date per topic
    const lastLogMap = new Map<string, Date>();
    for (const log of timeLogs) {
      const d = new Date(log.loggedAt);
      const existing = lastLogMap.get(log.topicId);
      if (!existing || d > existing) {
        lastLogMap.set(log.topicId, d);
      }
    }

    // Unread item count per topic
    const unreadCountMap = new Map<string, number>();
    for (const item of items) {
      if (item.status !== "unread") continue;
      for (const topicId of item.topicIds ?? []) {
        unreadCountMap.set(topicId, (unreadCountMap.get(topicId) ?? 0) + 1);
      }
    }

    const now = Date.now();
    const dayMs = 86_400_000;

    const scored = activeTopics.map((topic) => {
      let score = 0;
      let reason = "";

      // 1. Priority drift (0-50 points)
      // If topic has priority > 0, compare actual % vs target %
      const hasPriorities = activeTopics.some((t) => t.priority > 0);
      if (hasPriorities && topic.priority > 0 && totalSpent > 0) {
        const actualPercent = (topic.timeSpent / totalSpent) * 100;
        const drift = topic.priority - actualPercent; // positive = under-served
        if (drift > 0) {
          score += Math.min(50, drift * 1.5);
          reason = `${Math.round(drift)}% behind target`;
        }
      } else if (hasPriorities && topic.priority > 0 && totalSpent === 0) {
        // No time spent yet, priority topics should be recommended
        score += topic.priority * 0.5;
        reason = `${topic.priority}% priority, not started`;
      }

      // 2. Recency (0-30 points)
      const lastLog = lastLogMap.get(topic.id);
      if (lastLog) {
        const daysSince = Math.floor((now - lastLog.getTime()) / dayMs);
        if (daysSince >= 1) {
          score += Math.min(30, daysSince * 5);
          if (!reason) {
            reason = daysSince === 1 ? "1 day since last session" : `${daysSince} days since last session`;
          }
        }
      } else {
        // Never worked on — strong signal
        score += 25;
        if (!reason) reason = "not started yet";
      }

      // 3. Actionability — has unread items (0-20 points)
      const unreadCount = unreadCountMap.get(topic.id) ?? 0;
      if (unreadCount > 0) {
        score += Math.min(20, unreadCount * 4);
      } else {
        // No items to work on — reduce score
        score *= 0.5;
        if (score > 0 && !reason) reason = "no items queued";
      }

      return { topicId: topic.id, topicName: topic.name, reason, score };
    });

    // Sort by score descending, pick the top
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (!top || top.score <= 0) return null;

    return top;
  }, [topics, items, timeLogs]);

  return recommendation;
}
