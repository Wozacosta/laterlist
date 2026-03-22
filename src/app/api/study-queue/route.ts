import { type NextRequest } from "next/server";
import { readTopics } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/authMiddleware";
import { maxInterval, urgency } from "@/lib/spacedRepetition";

const DAY_MS = 86_400_000;

interface StudyQueueEntry {
  topicId: string;
  topicName: string;
  priority: number;
  urgencyScore: number;
  daysSinceActivity: number;
  maxIntervalDays: number;
  isOverdue: boolean;
  reason: string;
}

/**
 * GET /api/study-queue
 * Returns the ranked study queue — active topics sorted by SR urgency.
 * Topics with unmet prerequisites are filtered out.
 */
export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const topics = readTopics();
  const now = Date.now();

  // Build set of completed topic IDs for prerequisite checking
  const completedIds = new Set(
    topics.filter((t) => t.status === "completed").map((t) => t.id)
  );

  // Filter to active topics with all prerequisites completed
  const activeTopics = topics.filter((t) => {
    if (t.status !== "active") return false;
    const deps = t.dependsOn ?? [];
    return deps.every((depId) => completedIds.has(depId));
  });

  const entries: StudyQueueEntry[] = activeTopics.map((topic) => {
    const priority = topic.priority ?? 3;
    const maxDays = maxInterval(priority);

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
      urgencyScore: Math.round(score * 100) / 100,
      daysSinceActivity: Math.round(daysSince * 10) / 10,
      maxIntervalDays: maxDays,
      isOverdue,
      reason,
    };
  });

  // Sort by urgency descending
  entries.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return Response.json(entries);
}
