/**
 * Seed Script Tests (LT-90)
 *
 * Validates the mock data generator produces realistic, valid data:
 * - Correct number of topics, items, time logs
 * - All required fields present with valid values
 * - Relationships (item→topic) are consistent
 * - Data covers various stages (active, completed, overdue, fresh)
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

    // Various priorities
    const priorities = new Set(topics.map((t) => t.priority));
    expect(priorities.size).toBeGreaterThanOrEqual(4);

    // Some have notes
    const withNotes = topics.filter((t) => t.notes);
    expect(withNotes.length).toBeGreaterThanOrEqual(4);

    // Some have estimates
    const withEstimates = topics.filter((t) => t.estimatedSeconds);
    expect(withEstimates.length).toBeGreaterThanOrEqual(3);

    // Some have dependencies
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

    // Mix of URL and manual items
    const withUrl = items.filter((i) => i.url);
    const manual = items.filter((i) => !i.url);
    expect(withUrl.length).toBeGreaterThanOrEqual(10);
    expect(manual.length).toBeGreaterThanOrEqual(3);

    // Mix of done and unread
    const done = items.filter((i) => i.status === "done");
    const unread = items.filter((i) => i.status === "unread");
    expect(done.length).toBeGreaterThanOrEqual(8);
    expect(unread.length).toBeGreaterThanOrEqual(8);

    // Standalone items (no topic)
    const standalone = items.filter((i) => !i.topicIds?.length);
    expect(standalone.length).toBeGreaterThanOrEqual(1);

    // Various categories
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

    // Mix of manual and auto-logged
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

  it("is deterministic with the same seed", () => {
    seedMockData(42);
    const topics1 = readTopics();
    const items1 = readItems();

    clearAllData();
    seedMockData(42);
    const topics2 = readTopics();
    const items2 = readItems();

    expect(topics1.map((t) => t.id)).toEqual(topics2.map((t) => t.id));
    expect(items1.map((i) => i.id)).toEqual(items2.map((i) => i.id));
    // addedAt uses rand() so should be same with same seed
    expect(items1.map((i) => i.addedAt)).toEqual(items2.map((i) => i.addedAt));
  });

  it("produces different data with different seeds", () => {
    seedMockData(42);
    const items1 = readItems().map((i) => i.addedAt);

    clearAllData();
    seedMockData(99);
    const items2 = readItems().map((i) => i.addedAt);

    // Different seeds produce different random addedAt values
    expect(items1).not.toEqual(items2);
  });
});
