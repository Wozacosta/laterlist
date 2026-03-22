/**
 * Seed Script Tests (LT-90, LT-91)
 *
 * Validates the mock data generator produces realistic, valid data:
 * - Correct number of topics, items, time logs
 * - All required fields present with valid values
 * - Relationships (item→topic) are consistent
 * - Data covers various stages (active, completed, overdue, fresh)
 * - Fully deterministic: same seed + referenceTime → byte-identical output (LT-91)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { seedMockData, clearAllData } from "@/lib/seed";
import {
  readTopics,
  readItems,
  readTimeLogs,
  writeTopics,
  writeItems,
  writeTimeLogs,
} from "@/lib/server/store";

describe("Mock Data Seed (LT-90)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  it("seeds correct counts", () => {
    const result = seedMockData();

    expect(result.topics).toBe(8);
    expect(result.items).toBeGreaterThanOrEqual(25);
    expect(result.timeLogs).toBeGreaterThan(20);

    expect(readTopics()).toHaveLength(result.topics);
    expect(readItems()).toHaveLength(result.items);
    expect(readTimeLogs()).toHaveLength(result.timeLogs);
  });

  it("generates topics at various stages", () => {
    seedMockData();
    const topics = readTopics();

    const active = topics.filter((t) => t.status === "active");
    const completed = topics.filter((t) => t.status === "completed");
    expect(active.length).toBeGreaterThanOrEqual(5);
    expect(completed.length).toBeGreaterThanOrEqual(1);

    const priorities = new Set(topics.map((t) => t.priority));
    expect(priorities.size).toBeGreaterThanOrEqual(4);

    const withNotes = topics.filter((t) => t.notes);
    expect(withNotes.length).toBeGreaterThanOrEqual(4);

    const withEstimates = topics.filter((t) => t.estimatedSeconds);
    expect(withEstimates.length).toBeGreaterThanOrEqual(3);

    const withDeps = topics.filter((t) => t.dependsOn?.length);
    expect(withDeps.length).toBeGreaterThanOrEqual(1);
  });

  it("generates items with valid fields", () => {
    seedMockData();
    const items = readItems();

    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(typeof item.category).toBe("string");
      expect(Array.isArray(item.tags)).toBe(true);
      expect(["unread", "done"]).toContain(item.status);
      expect(item.addedAt).toBeTruthy();

      if (item.status === "done") {
        expect(item.doneAt).toBeTruthy();
      }
    }

    const withUrl = items.filter((i) => i.url);
    const manual = items.filter((i) => !i.url);
    expect(withUrl.length).toBeGreaterThanOrEqual(10);
    expect(manual.length).toBeGreaterThanOrEqual(3);

    const done = items.filter((i) => i.status === "done");
    const unread = items.filter((i) => i.status === "unread");
    expect(done.length).toBeGreaterThanOrEqual(8);
    expect(unread.length).toBeGreaterThanOrEqual(8);

    const standalone = items.filter((i) => !i.topicIds?.length);
    expect(standalone.length).toBeGreaterThanOrEqual(1);

    const categories = new Set(items.map((i) => i.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it("generates time logs with valid references", () => {
    seedMockData();
    const topics = readTopics();
    const timeLogs = readTimeLogs();
    const topicIds = new Set(topics.map((t) => t.id));

    for (const log of timeLogs) {
      expect(log.id).toBeTruthy();
      expect(topicIds.has(log.topicId)).toBe(true);
      expect(log.seconds).toBeGreaterThan(0);
      expect(log.loggedAt).toBeTruthy();
      expect(["manual", "done"]).toContain(log.source);
    }

    const manual = timeLogs.filter((l) => l.source === "manual");
    const auto = timeLogs.filter((l) => l.source === "done");
    expect(manual.length).toBeGreaterThan(10);
    expect(auto.length).toBeGreaterThan(5);
  });

  it("clearAllData removes everything", () => {
    seedMockData();
    expect(readTopics().length).toBeGreaterThan(0);

    clearAllData();
    expect(readTopics()).toHaveLength(0);
    expect(readItems()).toHaveLength(0);
    expect(readTimeLogs()).toHaveLength(0);
  });
});

describe("Deterministic Seeding (LT-91)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  it("default seed produces byte-identical output across runs", () => {
    // Run 1
    seedMockData();
    const json1 = {
      topics: JSON.stringify(readTopics()),
      items: JSON.stringify(readItems()),
      timeLogs: JSON.stringify(readTimeLogs()),
    };

    // Run 2
    clearAllData();
    seedMockData();
    const json2 = {
      topics: JSON.stringify(readTopics()),
      items: JSON.stringify(readItems()),
      timeLogs: JSON.stringify(readTimeLogs()),
    };

    // Byte-identical — every field including timestamps
    expect(json1.topics).toBe(json2.topics);
    expect(json1.items).toBe(json2.items);
    expect(json1.timeLogs).toBe(json2.timeLogs);
  });

  it("same seed + referenceTime → identical timestamps", () => {
    const refTime = new Date("2026-01-15T10:00:00Z").getTime();

    seedMockData(42, refTime);
    const topics1 = readTopics();
    const items1 = readItems();
    const logs1 = readTimeLogs();

    clearAllData();
    seedMockData(42, refTime);
    const topics2 = readTopics();
    const items2 = readItems();
    const logs2 = readTimeLogs();

    // Every single field must match
    expect(topics1).toEqual(topics2);
    expect(items1).toEqual(items2);
    expect(logs1).toEqual(logs2);
  });

  it("timestamps are anchored to referenceTime, not Date.now()", () => {
    const refTime = new Date("2026-06-01T00:00:00Z").getTime();
    seedMockData(42, refTime);

    const topics = readTopics();
    // The most recently created topic was created 20 days before refTime
    // All createdAt should be before refTime
    for (const topic of topics) {
      expect(new Date(topic.createdAt).getTime()).toBeLessThan(refTime);
    }

    // Verify a specific topic's lastActivityDate is relative to refTime
    const dsa = topics.find((t) => t.name === "Data Structures & Algorithms")!;
    // DSA has lastActivityDaysAgo: 1, so lastActivityDate should be ~1 day before refTime
    const daysBefore = (refTime - new Date(dsa.lastActivityDate!).getTime()) / 86_400_000;
    expect(daysBefore).toBeCloseTo(1, 0);
  });

  it("different seeds produce different data", () => {
    seedMockData(42);
    const items1 = readItems().map((i) => i.addedAt);

    clearAllData();
    seedMockData(99);
    const items2 = readItems().map((i) => i.addedAt);

    expect(items1).not.toEqual(items2);
  });

  it("different referenceTime shifts all timestamps", () => {
    const time1 = new Date("2026-03-01T00:00:00Z").getTime();
    const time2 = new Date("2026-06-01T00:00:00Z").getTime();

    seedMockData(42, time1);
    const topics1 = readTopics().map((t) => t.createdAt);

    clearAllData();
    seedMockData(42, time2);
    const topics2 = readTopics().map((t) => t.createdAt);

    // Same seed but different reference times → different timestamps
    expect(topics1).not.toEqual(topics2);

    // The offset should be consistent (time2 - time1 = 92 days)
    const t1 = new Date(topics1[0]).getTime();
    const t2 = new Date(topics2[0]).getTime();
    expect(t2 - t1).toBe(time2 - time1);
  });
});
