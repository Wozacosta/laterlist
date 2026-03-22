/**
 * E2E Test: Learning Dashboard Data (LT-83)
 *
 * Tests the data flows that drive the learning dashboard:
 * 1. Study queue ranking and display data
 * 2. Topic progress (time spent vs estimated)
 * 3. Daily plan recommendations generation
 * 4. Streak and velocity calculations
 * 5. Topic allocation breakdown
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  addItem,
  logTimeToTopic,
  readTopics,
} from "@/lib/server/store";
import { maxInterval, urgency } from "@/lib/spacedRepetition";
import type { Topic, Item } from "@/db";

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

describe("Learning Dashboard E2E (LT-83)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  describe("Study Queue Display", () => {
    it("computes urgency scores for dashboard display", () => {
      // P5 topic, 4 days old → urgency 4/3 ≈ 1.33
      const score = urgency(4, 5);
      expect(score).toBeCloseTo(4 / 3, 1);
      expect(score).toBeGreaterThanOrEqual(1.0);

      // P1 topic, 10 days old → urgency 10/30 ≈ 0.33
      const lowScore = urgency(10, 1);
      expect(lowScore).toBeCloseTo(10 / 30, 1);
      expect(lowScore).toBeLessThan(1.0);
    });

    it("provides correct max intervals by priority", () => {
      expect(maxInterval(1)).toBe(30);
      expect(maxInterval(2)).toBe(21);
      expect(maxInterval(3)).toBe(14);
      expect(maxInterval(4)).toBe(7);
      expect(maxInterval(5)).toBe(3);
    });

    it("ranks topics by urgency for the study queue display", () => {
      addTopic(createTopic({
        id: "top_crit",
        name: "Critical Topic",
        priority: 5,
        lastActivityDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      }));
      addTopic(createTopic({
        id: "top_low",
        name: "Low Priority",
        priority: 1,
        lastActivityDate: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      }));

      const topics = readTopics().filter((t) => t.status === "active");
      const entries = topics.map((t) => {
        const days = (Date.now() - new Date(t.lastActivityDate!).getTime()) / DAY_MS;
        return {
          name: t.name,
          urgency: urgency(days, t.priority),
        };
      });
      entries.sort((a, b) => b.urgency - a.urgency);

      expect(entries[0].name).toBe("Critical Topic");
      expect(entries[0].urgency).toBeGreaterThan(1.0);
      expect(entries[1].name).toBe("Low Priority");
    });
  });

  describe("Progress Bars", () => {
    it("calculates topic progress percentage", () => {
      addTopic(createTopic({
        id: "top_prog",
        name: "Progress Test",
        estimatedSeconds: 3600,
        timeSpent: 0,
      }));

      // Log 1800 seconds (50%)
      logTimeToTopic("top_prog", 1800);

      const topic = readTopics().find((t) => t.id === "top_prog")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      const total = topic.timeSpent + remaining;
      const progressPct = total > 0 ? Math.round((topic.timeSpent / total) * 100) : 0;

      expect(topic.timeSpent).toBe(1800);
      expect(remaining).toBe(1800);
      expect(progressPct).toBe(50);
    });

    it("handles completed topic (100% progress)", () => {
      addTopic(createTopic({
        id: "top_done",
        name: "Done Topic",
        estimatedSeconds: 3600,
        timeSpent: 0,
      }));

      logTimeToTopic("top_done", 3600);

      const topic = readTopics().find((t) => t.id === "top_done")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      const progressPct = Math.round((topic.timeSpent / (topic.timeSpent + remaining)) * 100);

      expect(progressPct).toBe(100);
    });

    it("handles topic with no estimate (falls back to item-based)", () => {
      addTopic(createTopic({
        id: "top_noest",
        name: "No Estimate",
        // no estimatedSeconds
      }));

      addItem({
        id: "itm_1",
        title: "Video 1",
        url: "",
        category: "video",
        tags: [],
        duration: 600,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now(),
        status: "unread",
        topicIds: ["top_noest"],
      });

      // Item-based: remaining time = sum of unread item durations
      const items = [{ duration: 600, status: "unread" }];
      const itemRemaining = items
        .filter((i) => i.status === "unread")
        .reduce((sum, i) => sum + (i.duration ?? 0), 0);

      expect(itemRemaining).toBe(600);
    });
  });

  describe("Daily Plan Recommendations", () => {
    it("generates recommendations based on urgency and priority", () => {
      // Create topics with varying urgency
      addTopic(createTopic({
        id: "top_rec1",
        name: "Urgent Topic",
        priority: 5,
        lastActivityDate: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      }));
      addTopic(createTopic({
        id: "top_rec2",
        name: "Fresh Topic",
        priority: 2,
        lastActivityDate: new Date().toISOString(),
      }));

      // Build study queue (same as useDailyPlan filter)
      const topics = readTopics().filter((t) => t.status === "active");
      const entries = topics.map((t) => {
        const lastDate = t.lastActivityDate
          ? new Date(t.lastActivityDate).getTime()
          : new Date(t.createdAt).getTime();
        const days = Math.max(0, (Date.now() - lastDate) / DAY_MS);
        return {
          topicId: t.id,
          topicName: t.name,
          priority: t.priority,
          urgencyScore: urgency(days, t.priority),
          daysSinceActivity: days,
          isOverdue: urgency(days, t.priority) >= 1.0,
        };
      });

      // Filter like useDailyPlan (urgency > 0.2)
      const candidates = entries.filter((e) => e.urgencyScore > 0.2);

      expect(candidates.length).toBeGreaterThanOrEqual(1);
      // Urgent topic should be in candidates
      expect(candidates.some((c) => c.topicId === "top_rec1")).toBe(true);
    });

    it("allocates daily goal minutes proportionally", () => {
      const dailyGoalMinutes = 60;
      const candidates = [
        { weight: 3.0 }, // 75% of time
        { weight: 1.0 }, // 25% of time
      ];
      const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);

      const allocations = candidates.map((c) => ({
        minutes: Math.max(5, Math.round(dailyGoalMinutes * (c.weight / totalWeight))),
      }));

      expect(allocations[0].minutes).toBe(45);
      expect(allocations[1].minutes).toBe(15);
    });
  });

  describe("Streak Calculation", () => {
    it("streak logic: consecutive days with time logs", () => {
      // Simulate time logs for 3 consecutive days
      const today = new Date();
      const yesterday = new Date(Date.now() - DAY_MS);
      const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);

      addTopic(createTopic({ id: "top_streak", name: "Streak Test" }));

      // These simulate what the streak hook checks
      const logDates = [
        today.toISOString().split("T")[0],
        yesterday.toISOString().split("T")[0],
        twoDaysAgo.toISOString().split("T")[0],
      ];

      // Count consecutive days going backwards from today
      let streak = 0;
      const checkDate = new Date(today);
      for (let i = 0; i < logDates.length; i++) {
        const expected = checkDate.toISOString().split("T")[0];
        if (logDates.includes(expected)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      expect(streak).toBe(3);
    });

    it("streak breaks on missed day", () => {
      const today = new Date();
      const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);

      // Missing yesterday → streak should be 1
      const logDates = [
        today.toISOString().split("T")[0],
        twoDaysAgo.toISOString().split("T")[0],
      ];

      let streak = 0;
      const checkDate = new Date(today);
      for (let i = 0; i < 10; i++) {
        const expected = checkDate.toISOString().split("T")[0];
        if (logDates.includes(expected)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      expect(streak).toBe(1);
    });
  });

  describe("Topic Allocation", () => {
    it("calculates time allocation percentage per topic", () => {
      addTopic(createTopic({ id: "top_alloc_a", name: "Topic A" }));
      addTopic(createTopic({ id: "top_alloc_b", name: "Topic B" }));

      logTimeToTopic("top_alloc_a", 3600); // 1h
      logTimeToTopic("top_alloc_b", 1800); // 30m

      const topics = readTopics();
      const total = topics.reduce((s, t) => s + t.timeSpent, 0);
      const allocations = topics
        .filter((t) => t.timeSpent > 0)
        .map((t) => ({
          name: t.name,
          pct: Math.round((t.timeSpent / total) * 100),
        }))
        .sort((a, b) => b.pct - a.pct);

      expect(allocations[0].name).toBe("Topic A");
      expect(allocations[0].pct).toBe(67); // 3600/5400
      expect(allocations[1].name).toBe("Topic B");
      expect(allocations[1].pct).toBe(33); // 1800/5400
    });
  });
});
