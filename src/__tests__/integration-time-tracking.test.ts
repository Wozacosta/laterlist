/**
 * Integration Tests: Time Tracking (LT-85)
 *
 * Covers PRD requirements LT-10 through LT-13:
 * - LT-10: Auto-log duration on item completion
 * - LT-11: Manual time logging against topics
 * - LT-12: Remaining time per topic (progress bars)
 * - LT-13: Mark topic complete/reopen
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
  getItemById,
  getItemsByTopicId,
  updateItem,
  logTimeToTopic,
  getTimeLogsByTopicId,
  readTimeLogs,
} from "@/lib/server/store";
import type { Topic, Item } from "@/db";

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

function makeItem(id: string, title: string, overrides?: Partial<Item>): Item {
  return {
    id,
    title,
    url: "",
    category: "other",
    tags: [],
    addedAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "unread",
    ...overrides,
  };
}

describe("Time Tracking Integration (LT-85)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  // ── LT-10: Auto-log duration on item completion ──────────────────────

  describe("LT-10: Auto-log on completion", () => {
    it("logs item duration to topic when item is marked done", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Video", {
        topicIds: ["t1"],
        duration: 600, // 10 min
      }));

      // Simulate marking done + logging (as the frontend does)
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 600, "done");

      const topic = getTopicById("t1")!;
      expect(topic.timeSpent).toBe(600);

      const logs = getTimeLogsByTopicId("t1");
      expect(logs).toHaveLength(1);
      expect(logs[0].seconds).toBe(600);
      expect(logs[0].source).toBe("done");
    });

    it("accumulates time from multiple completed items", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "V1", { topicIds: ["t1"], duration: 300 }));
      addItem(makeItem("i2", "V2", { topicIds: ["t1"], duration: 900 }));

      // Complete both
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 300, "done");

      updateItem("i2", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 900, "done");

      expect(getTopicById("t1")!.timeSpent).toBe(1200);
      expect(getTimeLogsByTopicId("t1")).toHaveLength(2);
    });

    it("does not log time for items without duration", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Note item", { topicIds: ["t1"] }));
      // No duration set

      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      // Frontend would skip logTimeToTopic if no duration

      expect(getTopicById("t1")!.timeSpent).toBe(0);
      expect(getTimeLogsByTopicId("t1")).toHaveLength(0);
    });

    it("resets SR clock on item completion", () => {
      addTopic(makeTopic("t1", "Rust", {
        lastActivityDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      }));
      addItem(makeItem("i1", "V1", { topicIds: ["t1"], duration: 600 }));

      const beforeActivity = getTopicById("t1")!.lastActivityDate;

      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 600, "done");

      const topic = getTopicById("t1")!;
      expect(topic.lastActivityDate).not.toBe(beforeActivity);
      expect(topic.currentInterval).toBe(1);
    });
  });

  // ── LT-11: Manual time logging ───────────────────────────────────────

  describe("LT-11: Manual time logging", () => {
    it("logs manual time to a topic", () => {
      addTopic(makeTopic("t1", "Rust"));

      logTimeToTopic("t1", 1800, "manual"); // 30 min

      expect(getTopicById("t1")!.timeSpent).toBe(1800);
      const logs = getTimeLogsByTopicId("t1");
      expect(logs).toHaveLength(1);
      expect(logs[0].source).toBe("manual");
      expect(logs[0].seconds).toBe(1800);
    });

    it("manual and auto logs accumulate correctly", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "V1", { topicIds: ["t1"], duration: 600 }));

      // Auto-log from completion
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      logTimeToTopic("t1", 600, "done");

      // Manual log
      logTimeToTopic("t1", 1200, "manual");

      expect(getTopicById("t1")!.timeSpent).toBe(1800);
      const logs = getTimeLogsByTopicId("t1");
      expect(logs).toHaveLength(2);
      expect(logs.find((l) => l.source === "done")?.seconds).toBe(600);
      expect(logs.find((l) => l.source === "manual")?.seconds).toBe(1200);
    });

    it("manual log resets SR clock", () => {
      const oldDate = new Date(Date.now() - 86400000 * 10).toISOString();
      addTopic(makeTopic("t1", "Rust", { lastActivityDate: oldDate }));

      logTimeToTopic("t1", 900, "manual");

      const topic = getTopicById("t1")!;
      expect(topic.lastActivityDate).not.toBe(oldDate);
      expect(topic.currentInterval).toBe(1);
    });

    it("returns null when topic does not exist", () => {
      const result = logTimeToTopic("nonexistent", 600);
      expect(result).toBeNull();
    });
  });

  // ── LT-12: Remaining time per topic ──────────────────────────────────

  describe("LT-12: Remaining time", () => {
    it("calculates remaining from estimate minus spent", () => {
      addTopic(makeTopic("t1", "Rust", {
        estimatedSeconds: 7200, // 2h
        timeSpent: 0,
      }));

      logTimeToTopic("t1", 3600); // log 1h

      const topic = getTopicById("t1")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      expect(remaining).toBe(3600); // 1h remaining
    });

    it("remaining is 0 when spent exceeds estimate", () => {
      addTopic(makeTopic("t1", "Rust", {
        estimatedSeconds: 1800,
        timeSpent: 0,
      }));

      logTimeToTopic("t1", 2400); // spent more than estimated

      const topic = getTopicById("t1")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      expect(remaining).toBe(0);
    });

    it("falls back to item-based remaining when no estimate", () => {
      addTopic(makeTopic("t1", "Rust")); // no estimatedSeconds
      addItem(makeItem("i1", "V1", { topicIds: ["t1"], duration: 600, status: "unread" }));
      addItem(makeItem("i2", "V2", { topicIds: ["t1"], duration: 900, status: "unread" }));
      addItem(makeItem("i3", "Done", { topicIds: ["t1"], duration: 300, status: "done" }));

      const items = getItemsByTopicId("t1");
      const topic = getTopicById("t1")!;

      // When no estimate, remaining = sum of unread item durations
      const itemRemaining = items
        .filter((i) => i.status === "unread")
        .reduce((sum, i) => sum + (i.duration ?? 0), 0);

      expect(itemRemaining).toBe(1500); // 600 + 900
      expect(topic.estimatedSeconds).toBeUndefined();
    });

    it("progress percentage calculation", () => {
      addTopic(makeTopic("t1", "Rust", { estimatedSeconds: 3600 }));
      logTimeToTopic("t1", 900); // 25%

      const topic = getTopicById("t1")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      const total = topic.timeSpent + remaining;
      const pct = total > 0 ? Math.round((topic.timeSpent / total) * 100) : 0;

      expect(pct).toBe(25);
    });
  });

  // ── LT-13: Topic complete/reopen ─────────────────────────────────────

  describe("LT-13: Topic complete/reopen", () => {
    it("marks topic as completed with timestamp", () => {
      addTopic(makeTopic("t1", "Rust"));
      const now = new Date().toISOString();

      updateTopic("t1", {
        status: "completed",
        completedAt: now,
      });

      const topic = getTopicById("t1")!;
      expect(topic.status).toBe("completed");
      expect(topic.completedAt).toBe(now);
    });

    it("reopens a completed topic", () => {
      addTopic(makeTopic("t1", "Rust", {
        status: "completed",
        completedAt: new Date().toISOString(),
      }));

      updateTopic("t1", {
        status: "active",
        completedAt: undefined,
      });

      const topic = getTopicById("t1")!;
      expect(topic.status).toBe("active");
      expect(topic.completedAt).toBeUndefined();
    });

    it("completed topic retains time spent data", () => {
      addTopic(makeTopic("t1", "Rust"));
      logTimeToTopic("t1", 3600);

      updateTopic("t1", {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      const topic = getTopicById("t1")!;
      expect(topic.status).toBe("completed");
      expect(topic.timeSpent).toBe(3600);
    });

    it("completed topic is excluded from active queries", () => {
      addTopic(makeTopic("t1", "Active"));
      addTopic(makeTopic("t2", "Done", {
        status: "completed",
        completedAt: new Date().toISOString(),
      }));

      // Simulate status filter (same as GET /api/topics?status=active)
      const active = readTopics().filter((t) => t.status === "active");
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe("Active");
    });

    it("time logs persist after topic completion", () => {
      addTopic(makeTopic("t1", "Rust"));
      logTimeToTopic("t1", 1800);
      logTimeToTopic("t1", 900);

      updateTopic("t1", { status: "completed", completedAt: new Date().toISOString() });

      const logs = getTimeLogsByTopicId("t1");
      expect(logs).toHaveLength(2);
      expect(logs.reduce((s, l) => s + l.seconds, 0)).toBe(2700);
    });
  });
});
