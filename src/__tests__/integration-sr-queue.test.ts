/**
 * Integration Tests: Spaced Repetition & Study Queue (LT-86)
 *
 * Covers PRD requirements LT-20 through LT-24:
 * - LT-20: SR clock tracks last activity date per topic
 * - LT-21: SR clock resets on item completion, manual log, or mark-studied
 * - LT-22: Priority-scaled max intervals (P1=30d, P5=3d)
 * - LT-23: Study queue ranks topics by urgency score (days/maxInterval)
 * - LT-24: Mark-studied resets SR without logging time
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  getTopicById,
  updateTopic,
  readTopics,
  addItem,
  updateItem,
  logTimeToTopic,
} from "@/lib/server/store";
import { maxInterval, urgency } from "@/lib/spacedRepetition";
import type { Topic } from "@/db";

const DAY_MS = 86_400_000;

function makeTopic(id: string, name: string, overrides?: Partial<Topic>): Topic {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "active",
    timeSpent: 0,
    priority: 3,
    currentInterval: 1,
    ...overrides,
  };
}

/** Build study queue from topics (mirrors API/hook logic). */
function buildQueue(topics: Topic[]) {
  const now = Date.now();
  const completedIds = new Set(
    topics.filter((t) => t.status === "completed").map((t) => t.id)
  );
  return topics
    .filter((t) => {
      if (t.status !== "active") return false;
      return (t.dependsOn ?? []).every((d) => completedIds.has(d));
    })
    .map((t) => {
      const lastDate = t.lastActivityDate
        ? new Date(t.lastActivityDate).getTime()
        : new Date(t.createdAt).getTime();
      const days = Math.max(0, (now - lastDate) / DAY_MS);
      const score = urgency(days, t.priority);
      return {
        topicId: t.id,
        topicName: t.name,
        priority: t.priority,
        urgencyScore: score,
        daysSinceActivity: days,
        isOverdue: score >= 1.0,
      };
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore);
}

describe("SR & Study Queue Integration (LT-86)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  // ── LT-20: SR clock tracks lastActivityDate ──────────────────────────

  describe("LT-20: SR clock tracking", () => {
    it("new topic has no lastActivityDate", () => {
      addTopic(makeTopic("t1", "New"));
      expect(getTopicById("t1")!.lastActivityDate).toBeUndefined();
    });

    it("lastActivityDate is set when time is logged", () => {
      addTopic(makeTopic("t1", "Test"));
      logTimeToTopic("t1", 600);
      expect(getTopicById("t1")!.lastActivityDate).toBeDefined();
    });

    it("lastActivityDate updates to most recent activity", () => {
      const old = new Date(Date.now() - 5 * DAY_MS).toISOString();
      addTopic(makeTopic("t1", "Test", { lastActivityDate: old }));

      logTimeToTopic("t1", 300);
      const updated = getTopicById("t1")!.lastActivityDate!;
      expect(new Date(updated).getTime()).toBeGreaterThan(new Date(old).getTime());
    });
  });

  // ── LT-21: SR clock resets on various actions ─────────────────────────

  describe("LT-21: SR clock reset", () => {
    it("resets on manual time log", () => {
      const old = new Date(Date.now() - 10 * DAY_MS).toISOString();
      addTopic(makeTopic("t1", "Test", { lastActivityDate: old, currentInterval: 5 }));

      logTimeToTopic("t1", 1800, "manual");

      const topic = getTopicById("t1")!;
      expect(topic.currentInterval).toBe(1);
      expect(new Date(topic.lastActivityDate!).getTime()).toBeGreaterThan(
        new Date(old).getTime()
      );
    });

    it("resets on item completion (auto-log)", () => {
      const old = new Date(Date.now() - 7 * DAY_MS).toISOString();
      addTopic(makeTopic("t1", "Test", { lastActivityDate: old }));
      addItem({
        id: "i1", title: "V", url: "", category: "video", tags: [],
        duration: 600, addedAt: new Date().toISOString(), sortOrder: Date.now(),
        status: "unread", topicIds: ["t1"],
      });

      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 600, "done");

      const topic = getTopicById("t1")!;
      expect(topic.currentInterval).toBe(1);
    });

    it("resets on mark-studied (no time logged)", () => {
      const old = new Date(Date.now() - 14 * DAY_MS).toISOString();
      addTopic(makeTopic("t1", "Test", { lastActivityDate: old, currentInterval: 7 }));

      // Simulate POST /api/study-queue/:id/studied
      updateTopic("t1", {
        lastActivityDate: new Date().toISOString(),
        currentInterval: 1,
      });

      const topic = getTopicById("t1")!;
      expect(topic.currentInterval).toBe(1);
      expect(topic.timeSpent).toBe(0); // no time was logged
    });
  });

  // ── LT-22: Priority-scaled intervals ──────────────────────────────────

  describe("LT-22: Priority-scaled intervals", () => {
    it("P1 has 30-day max interval", () => {
      expect(maxInterval(1)).toBe(30);
    });

    it("P2 has 21-day max interval", () => {
      expect(maxInterval(2)).toBe(21);
    });

    it("P3 has 14-day max interval (default)", () => {
      expect(maxInterval(3)).toBe(14);
    });

    it("P4 has 7-day max interval", () => {
      expect(maxInterval(4)).toBe(7);
    });

    it("P5 has 3-day max interval (critical)", () => {
      expect(maxInterval(5)).toBe(3);
    });

    it("higher priority means faster overdue", () => {
      const days = 5;
      const p1Score = urgency(days, 1); // 5/30 = 0.17
      const p5Score = urgency(days, 5); // 5/3 = 1.67

      expect(p5Score).toBeGreaterThan(p1Score);
      expect(p5Score).toBeGreaterThanOrEqual(1.0); // overdue
      expect(p1Score).toBeLessThan(1.0); // not overdue
    });
  });

  // ── LT-23: Study queue ranking ────────────────────────────────────────

  describe("LT-23: Queue ranking by urgency", () => {
    it("topics ranked by urgency score descending", () => {
      addTopic(makeTopic("t_p5", "Critical", {
        priority: 5,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      }));
      addTopic(makeTopic("t_p1", "Casual", {
        priority: 1,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      }));
      addTopic(makeTopic("t_p3", "Default", {
        priority: 3,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      }));

      const queue = buildQueue(readTopics());
      expect(queue[0].topicId).toBe("t_p5"); // 4/3 ≈ 1.33
      expect(queue[1].topicId).toBe("t_p3"); // 4/14 ≈ 0.29
      expect(queue[2].topicId).toBe("t_p1"); // 4/30 ≈ 0.13
    });

    it("overdue topics (score >= 1.0) flagged correctly", () => {
      addTopic(makeTopic("t1", "Overdue", {
        priority: 5,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      }));
      addTopic(makeTopic("t2", "Fine", {
        priority: 1,
        lastActivityDate: new Date(Date.now() - 1 * DAY_MS).toISOString(),
      }));

      const queue = buildQueue(readTopics());
      expect(queue.find((e) => e.topicId === "t1")!.isOverdue).toBe(true);
      expect(queue.find((e) => e.topicId === "t2")!.isOverdue).toBe(false);
    });

    it("recently studied topics have low urgency", () => {
      addTopic(makeTopic("t1", "Just Studied", {
        priority: 5,
        lastActivityDate: new Date().toISOString(),
      }));

      const queue = buildQueue(readTopics());
      expect(queue[0].urgencyScore).toBeLessThan(0.1);
      expect(queue[0].isOverdue).toBe(false);
    });

    it("completed topics excluded from queue", () => {
      addTopic(makeTopic("t1", "Active", { priority: 3 }));
      addTopic(makeTopic("t2", "Done", {
        priority: 3,
        status: "completed",
        completedAt: new Date().toISOString(),
      }));

      const queue = buildQueue(readTopics());
      expect(queue).toHaveLength(1);
      expect(queue[0].topicId).toBe("t1");
    });

    it("topics with unmet deps excluded from queue", () => {
      addTopic(makeTopic("t_prereq", "Prereq", { priority: 3 }));
      addTopic(makeTopic("t_blocked", "Blocked", {
        priority: 5,
        dependsOn: ["t_prereq"],
      }));

      const queue = buildQueue(readTopics());
      const ids = queue.map((e) => e.topicId);
      expect(ids).toContain("t_prereq");
      expect(ids).not.toContain("t_blocked");
    });
  });

  // ── LT-24: Mark-studied without logging time ─────────────────────────

  describe("LT-24: Mark studied", () => {
    it("resets SR clock without adding timeSpent", () => {
      addTopic(makeTopic("t1", "Test", {
        lastActivityDate: new Date(Date.now() - 10 * DAY_MS).toISOString(),
        timeSpent: 500,
      }));

      // Mark studied
      updateTopic("t1", {
        lastActivityDate: new Date().toISOString(),
        currentInterval: 1,
      });

      const topic = getTopicById("t1")!;
      expect(topic.timeSpent).toBe(500); // unchanged
      expect(topic.currentInterval).toBe(1);

      // Should now have low urgency
      const queue = buildQueue(readTopics());
      expect(queue[0].urgencyScore).toBeLessThan(0.1);
    });

    it("mark-studied drops topic out of overdue", () => {
      addTopic(makeTopic("t1", "Overdue", {
        priority: 5,
        lastActivityDate: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      }));

      // Verify overdue
      let queue = buildQueue(readTopics());
      expect(queue[0].isOverdue).toBe(true);

      // Mark studied
      updateTopic("t1", {
        lastActivityDate: new Date().toISOString(),
        currentInterval: 1,
      });

      // No longer overdue
      queue = buildQueue(readTopics());
      expect(queue[0].isOverdue).toBe(false);
    });
  });
});
