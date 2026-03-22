import { useMemo } from "react";
import type { Topic, Item } from "@/db";
import { maxInterval, urgency } from "@/lib/spacedRepetition";

export interface StudyQueueEntry {
  topicId: string;
  topicName: string;
  priority: number;
  urgencyScore: number;
  daysSinceActivity: number;
  maxIntervalDays: number;
  isOverdue: boolean;
  reason: string;
  latestNote?: string;
}

const DAY_MS = 86_400_000;

/**
 * Ranks active topics by spaced-repetition urgency.
 * urgency = daysSinceLastActivity / maxInterval(priority)
 * Topics with urgency >= 1.0 are overdue for review.
 */
export function useStudyQueue(topics: Topic[], items: Item[] = []): StudyQueueEntry[] {
  return useMemo(() => {
    const now = Date.now();
    const activeTopics = topics.filter((t) => t.status === "active");

    // Build a map of topicId → most recent item note (by doneAt date)
    const latestItemNotes = new Map<string, string>();
    const latestItemDates = new Map<string, string>();
    for (const item of items) {
      if (!item.notes || !item.topicIds?.length) continue;
      for (const topicId of item.topicIds) {
        const prevDate = latestItemDates.get(topicId);
        const itemDate = item.doneAt ?? item.addedAt;
        if (!prevDate || itemDate > prevDate) {
          latestItemDates.set(topicId, itemDate);
          latestItemNotes.set(topicId, item.notes);
        }
      }
    }

    const entries: StudyQueueEntry[] = activeTopics.map((topic) => {
      const priority = topic.priority ?? 3;
      const maxDays = maxInterval(priority);

      // Use lastActivityDate if set, otherwise fall back to createdAt
      const lastDate = topic.lastActivityDate
        ? new Date(topic.lastActivityDate).getTime()
        : new Date(topic.createdAt).getTime();
      const daysSince = Math.max(0, (now - lastDate) / DAY_MS);
      const score = urgency(daysSince, priority);
      const isOverdue = score >= 1.0;

      let reason: string;
      if (!topic.lastActivityDate) {
        reason = "not started yet";
      } else if (isOverdue) {
        reason = `${Math.round(daysSince)}d overdue (max ${maxDays}d)`;
      } else if (daysSince < 1) {
        reason = "reviewed today";
      } else {
        reason = `${Math.round(daysSince)}d since last activity`;
      }

      // Prefer the most recent item note; fall back to topic-level notes
      const latestNote = latestItemNotes.get(topic.id) ?? topic.notes;

      return {
        topicId: topic.id,
        topicName: topic.name,
        priority,
        urgencyScore: score,
        daysSinceActivity: daysSince,
        maxIntervalDays: maxDays,
        isOverdue,
        reason,
        latestNote,
      };
    });

    // Sort by urgency descending — most urgent first
    entries.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return entries;
  }, [topics, items]);
}
