/**
 * E2E Test: Study Queue Flow (LT-81)
 *
 * Tests:
 * 1. Topic surfaces in study queue when overdue (urgency >= 1.0)
 * 2. Mark as studied resets the SR clock
 * 3. After marking studied, topic's urgency drops (exits overdue state)
 * 4. Topics with unmet prerequisites are filtered out
 * 5. Queue is ranked by urgency (most urgent first)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  readTopics,
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  getTopicById,
  updateTopic,
} from "@/lib/server/store";
import { maxInterval, urgency } from "@/lib/spacedRepetition";
import type { Topic } from "@/db";

const DAY_MS = 86_400_000;

function createTopic(overrides: Partial<Topic> & { id: string; name: string }): Topic {
  return {
    createdAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "active",
    timeSpent: 0,
    priority: 3,
    currentInterval: 1,
    ...overrides,
  };
}

/** Build a study queue from topics (same logic as the API route). */
function buildQueue(topics: Topic[]) {
  const now = Date.now();
  const completedIds = new Set(
    topics.filter((t) => t.status === "completed").map((t) => t.id)
  );

  const active = topics.filter((t) => {
    if (t.status !== "active") return false;
    const deps = t.dependsOn ?? [];
    return deps.every((depId) => completedIds.has(depId));
  });

  const entries = active.map((topic) => {
    const priority = topic.priority ?? 3;
    const maxDays = maxInterval(priority);
    const lastDate = topic.lastActivityDate
      ? new Date(topic.lastActivityDate).getTime()
      : new Date(topic.createdAt).getTime();
    const daysSince = Math.max(0, (now - lastDate) / DAY_MS);
    const score = urgency(daysSince, priority);

    return {
      topicId: topic.id,
      topicName: topic.name,
      priority,
      urgencyScore: score,
      daysSinceActivity: daysSince,
      maxIntervalDays: maxDays,
      isOverdue: score >= 1.0,
    };
  });

  entries.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return entries;
}

describe("Study Queue Flow E2E (LT-81)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  it("topic surfaces as overdue when past max interval", () => {
    // Priority 5 = max 3 days. Set lastActivityDate to 4 days ago → overdue.
    const fourDaysAgo = new Date(Date.now() - 4 * DAY_MS).toISOString();
    const topic = createTopic({
      id: "top_overdue",
      name: "Overdue Topic",
      priority: 5,
      lastActivityDate: fourDaysAgo,
    });
    addTopic(topic);

    const queue = buildQueue(readTopics());
    expect(queue).toHaveLength(1);
    expect(queue[0].topicId).toBe("top_overdue");
    expect(queue[0].isOverdue).toBe(true);
    expect(queue[0].urgencyScore).toBeGreaterThanOrEqual(1.0);
  });

  it("mark as studied resets SR clock and drops urgency", () => {
    // Create an overdue topic (P5, 4 days old)
    const fourDaysAgo = new Date(Date.now() - 4 * DAY_MS).toISOString();
    addTopic(
      createTopic({
        id: "top_studied",
        name: "Study Me",
        priority: 5,
        lastActivityDate: fourDaysAgo,
      })
    );

    // Verify it's overdue
    let queue = buildQueue(readTopics());
    expect(queue[0].isOverdue).toBe(true);

    // Mark as studied (same as POST /api/study-queue/:id/studied)
    const now = new Date().toISOString();
    updateTopic("top_studied", {
      lastActivityDate: now,
      currentInterval: 1,
    });

    // Verify it's no longer overdue
    queue = buildQueue(readTopics());
    expect(queue[0].isOverdue).toBe(false);
    expect(queue[0].urgencyScore).toBeLessThan(0.1); // just studied

    // Verify topic was updated
    const topic = getTopicById("top_studied")!;
    expect(topic.lastActivityDate).toBe(now);
    expect(topic.currentInterval).toBe(1);
  });

  it("queue is ranked by urgency — most urgent first", () => {
    // Topic A: P5, 4 days old → urgency = 4/3 ≈ 1.33
    addTopic(
      createTopic({
        id: "top_a",
        name: "Very Urgent",
        priority: 5,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      })
    );

    // Topic B: P3, 2 days old → urgency = 2/14 ≈ 0.14
    addTopic(
      createTopic({
        id: "top_b",
        name: "Not Urgent",
        priority: 3,
        lastActivityDate: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      })
    );

    // Topic C: P4, 5 days old → urgency = 5/7 ≈ 0.71
    addTopic(
      createTopic({
        id: "top_c",
        name: "Medium Urgent",
        priority: 4,
        lastActivityDate: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      })
    );

    const queue = buildQueue(readTopics());
    expect(queue).toHaveLength(3);
    expect(queue[0].topicId).toBe("top_a"); // most urgent
    expect(queue[1].topicId).toBe("top_c"); // medium
    expect(queue[2].topicId).toBe("top_b"); // least
  });

  it("filters out topics with unmet prerequisites", () => {
    // Prerequisite topic (completed)
    addTopic(
      createTopic({
        id: "top_prereq_done",
        name: "Prereq Done",
        status: "completed",
        completedAt: new Date().toISOString(),
      })
    );

    // Prerequisite topic (NOT completed)
    addTopic(
      createTopic({
        id: "top_prereq_pending",
        name: "Prereq Pending",
        priority: 3,
      })
    );

    // Topic with met prereq → should appear in queue
    addTopic(
      createTopic({
        id: "top_met",
        name: "Met Dependencies",
        dependsOn: ["top_prereq_done"],
      })
    );

    // Topic with unmet prereq → should NOT appear
    addTopic(
      createTopic({
        id: "top_unmet",
        name: "Unmet Dependencies",
        dependsOn: ["top_prereq_pending"],
      })
    );

    // Topic with no prereqs → should appear
    addTopic(
      createTopic({
        id: "top_free",
        name: "No Dependencies",
      })
    );

    const queue = buildQueue(readTopics());
    const queueIds = queue.map((e) => e.topicId);

    expect(queueIds).toContain("top_met");
    expect(queueIds).toContain("top_free");
    expect(queueIds).toContain("top_prereq_pending");
    expect(queueIds).not.toContain("top_unmet");
    expect(queueIds).not.toContain("top_prereq_done"); // completed, not active
  });

  it("topic with no activity uses createdAt for urgency", () => {
    // New topic created 20 days ago with P3 (max 14 days) → overdue
    const twentyDaysAgo = new Date(Date.now() - 20 * DAY_MS).toISOString();
    addTopic(
      createTopic({
        id: "top_new",
        name: "Never Started",
        priority: 3,
        createdAt: twentyDaysAgo,
        // no lastActivityDate
      })
    );

    const queue = buildQueue(readTopics());
    expect(queue).toHaveLength(1);
    expect(queue[0].isOverdue).toBe(true);
    expect(queue[0].urgencyScore).toBeGreaterThanOrEqual(1.0);
  });
});
