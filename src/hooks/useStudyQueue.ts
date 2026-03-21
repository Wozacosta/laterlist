import { useMemo } from "react";
import type { Topic } from "@/db";
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
}

const DAY_MS = 86_400_000;

/**
 * Ranks active topics by spaced-repetition urgency.
 * urgency = daysSinceLastActivity / maxInterval(priority)
 * Topics with urgency >= 1.0 are overdue for review.
 */
export function useStudyQueue(topics: Topic[]): StudyQueueEntry[] {
  return useMemo(() => {
    const now = Date.now();
    const activeTopics = topics.filter((t) => t.status === "active");

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

      return {
        topicId: topic.id,
        topicName: topic.name,
        priority,
        urgencyScore: score,
        daysSinceActivity: daysSince,
        maxIntervalDays: maxDays,
        isOverdue,
        reason,
      };
    });

    // Sort by urgency descending — most urgent first
    entries.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return entries;
  }, [topics]);
}
