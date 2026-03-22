import { useMemo } from "react";
import type { Topic, Item } from "@/db";
import type { StudyQueueEntry } from "@/hooks/useStudyQueue";

export interface DailyRecommendation {
  topicId: string;
  topicName: string;
  priority: number;
  urgencyScore: number;
  suggestedMinutes: number;
  rationale: string;
  suggestedItems: Item[];
}

const DEFAULT_DAILY_MINUTES = 30;

/**
 * Generates a personalized daily learning plan by allocating the user's
 * daily goal across topics ranked by spaced-repetition urgency, priority,
 * and recent activity patterns.
 *
 * Algorithm:
 * 1. Filter to topics that need attention (urgency > 0.2)
 * 2. Compute weight = urgencyScore * priorityMultiplier
 * 3. Allocate daily goal minutes proportionally by weight
 * 4. For each topic, suggest unfinished items that fit the time allocation
 * 5. Generate a human-readable rationale for each recommendation
 */
export function useDailyPlan(
  studyQueue: StudyQueueEntry[],
  topics: Topic[],
  items: Item[],
  dailyGoalMinutes: number,
  todaySeconds: number
): DailyRecommendation[] {
  return useMemo(() => {
    const goalMinutes = dailyGoalMinutes > 0 ? dailyGoalMinutes : DEFAULT_DAILY_MINUTES;
    const todayMinutes = Math.round(todaySeconds / 60);
    const remainingMinutes = Math.max(0, goalMinutes - todayMinutes);

    if (remainingMinutes === 0) return [];

    // Filter to topics worth recommending (some urgency or not started)
    const candidates = studyQueue.filter((e) => e.urgencyScore > 0.2);
    if (candidates.length === 0) return [];

    // Priority multiplier: P5 gets 2.5x weight, P1 gets 1x
    const priorityMultiplier = (p: number) => 0.5 + p * 0.4;

    // Compute weights
    const weighted = candidates.map((entry) => ({
      entry,
      weight: entry.urgencyScore * priorityMultiplier(entry.priority),
    }));

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

    // Build topic map for quick lookup
    const topicMap = new Map(topics.map((t) => [t.id, t]));

    // Allocate time and build recommendations
    const recommendations: DailyRecommendation[] = [];

    for (const { entry, weight } of weighted) {
      const fraction = weight / totalWeight;
      const allocatedMinutes = Math.max(5, Math.round(remainingMinutes * fraction));

      // Find unfinished items for this topic, shortest first
      const topicItems = items
        .filter(
          (i) =>
            i.status === "unread" &&
            i.topicIds?.includes(entry.topicId)
        )
        .sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity));

      // Pick items that fit within the allocated time
      const suggestedItems: Item[] = [];
      let usedSeconds = 0;
      const budgetSeconds = allocatedMinutes * 60;
      for (const item of topicItems) {
        const dur = item.duration ?? 0;
        if (dur > 0 && usedSeconds + dur > budgetSeconds && suggestedItems.length > 0) break;
        suggestedItems.push(item);
        usedSeconds += dur;
        if (suggestedItems.length >= 3) break; // cap suggestions per topic
      }

      const topic = topicMap.get(entry.topicId);
      const rationale = buildRationale(entry, topic, topicItems, suggestedItems);

      recommendations.push({
        topicId: entry.topicId,
        topicName: entry.topicName,
        priority: entry.priority,
        urgencyScore: entry.urgencyScore,
        suggestedMinutes: allocatedMinutes,
        rationale,
        suggestedItems,
      });
    }

    // Cap at 5 recommendations to keep it focused
    return recommendations.slice(0, 5);
  }, [studyQueue, topics, items, dailyGoalMinutes, todaySeconds]);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Category labels for item descriptions */
const CATEGORY_LABEL: Record<string, string> = {
  video: "video",
  article: "article",
  paper: "paper",
  repo: "repo",
  podcast: "podcast",
  doc: "doc",
};

/**
 * Builds a natural-language rationale for a daily recommendation.
 * References specific items by duration and type to create personalised
 * messages like: "You haven't touched Rust in 5 days and you have a
 * 45-min video queued up".
 */
function buildRationale(
  entry: StudyQueueEntry,
  topic: Topic | undefined,
  allPendingItems: Item[],
  suggestedItems: Item[]
): string {
  // --- Part 1: Urgency / timing opener ---
  let opener: string;
  const days = Math.round(entry.daysSinceActivity);

  if (!topic?.lastActivityDate) {
    opener = `You haven't started ${entry.topicName} yet`;
  } else if (entry.isOverdue) {
    opener = `You haven't touched ${entry.topicName} in ${days} days`;
  } else if (entry.daysSinceActivity >= 2) {
    opener = `It's been ${days} days since you studied ${entry.topicName}`;
  } else {
    opener = "You studied this recently — keep the momentum going";
  }

  // --- Part 2: Item-specific detail ---
  let itemDetail = "";
  if (suggestedItems.length > 0) {
    const top = suggestedItems[0];
    const catLabel = CATEGORY_LABEL[top.category] ?? "item";
    if (top.duration && top.duration > 0) {
      itemDetail = ` and you have a ${formatDuration(top.duration)} ${catLabel} queued up`;
    } else {
      itemDetail = ` and you have a ${catLabel} queued up`;
    }
    if (suggestedItems.length > 1) {
      const more = suggestedItems.length - 1;
      itemDetail += ` (+${more} more)`;
    }
  } else if (allPendingItems.length > 0) {
    itemDetail = ` with ${allPendingItems.length} item${allPendingItems.length !== 1 ? "s" : ""} waiting`;
  }

  // --- Part 3: Priority / remaining context suffix ---
  const suffixes: string[] = [];
  if (entry.priority >= 4) {
    suffixes.push("high priority");
  }
  if (topic && topic.estimatedSeconds && topic.estimatedSeconds > 0) {
    const remaining = Math.max(0, topic.estimatedSeconds - topic.timeSpent);
    if (remaining > 0) {
      suffixes.push(`${formatDuration(remaining)} remaining overall`);
    }
  }

  let result = opener + itemDetail;
  if (suffixes.length > 0) {
    result += ` · ${suffixes.join(" · ")}`;
  }
  return result;
}
