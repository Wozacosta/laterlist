/**
 * Integration Tests: Data Model (LT-84)
 *
 * Covers PRD requirements LT-01 through LT-09:
 * - LT-01: Topic CRUD (create, rename, delete)
 * - LT-02: Assign items to topics (many-to-many via topicIds)
 * - LT-03: URL enrichment fields (category, duration, tags)
 * - LT-04: Manual duration input on non-URL items
 * - LT-05: Topic time = sum of subtask durations
 * - LT-06: Manual topic time estimate (estimatedSeconds)
 * - LT-07: Cloud sync fields present (Dexie Cloud)
 * - LT-09: Items exist without topics
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  getTopicById,
  updateTopic,
  deleteTopic,
  readTopics,
  addItem,
  getItemById,
  getItemsByTopicId,
  updateItem,
  deleteItem,
  readItems,
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

describe("Data Model Integration (LT-84)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  // ── LT-01: Topic CRUD ────────────────────────────────────────────────

  describe("LT-01: Topic CRUD", () => {
    it("creates a topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      expect(getTopicById("t1")?.name).toBe("Rust");
    });

    it("renames a topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      updateTopic("t1", { name: "Advanced Rust" });
      expect(getTopicById("t1")?.name).toBe("Advanced Rust");
    });

    it("deletes a topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      expect(deleteTopic("t1")).toBe(true);
      expect(getTopicById("t1")).toBeUndefined();
    });

    it("delete returns false for non-existent topic", () => {
      expect(deleteTopic("nonexistent")).toBe(false);
    });

    it("lists all topics", () => {
      addTopic(makeTopic("t1", "Rust"));
      addTopic(makeTopic("t2", "Go"));
      expect(readTopics()).toHaveLength(2);
    });
  });

  // ── LT-02: Item-Topic assignment (many-to-many) ──────────────────────

  describe("LT-02: Item-Topic assignment", () => {
    it("assigns item to a single topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Video", { topicIds: ["t1"] }));

      expect(getItemsByTopicId("t1")).toHaveLength(1);
      expect(getItemById("i1")?.topicIds).toEqual(["t1"]);
    });

    it("assigns item to multiple topics (many-to-many)", () => {
      addTopic(makeTopic("t1", "Rust"));
      addTopic(makeTopic("t2", "Systems"));
      addItem(makeItem("i1", "Cross-topic article", { topicIds: ["t1", "t2"] }));

      expect(getItemsByTopicId("t1")).toHaveLength(1);
      expect(getItemsByTopicId("t2")).toHaveLength(1);
    });

    it("multiple items can belong to the same topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Item A", { topicIds: ["t1"] }));
      addItem(makeItem("i2", "Item B", { topicIds: ["t1"] }));
      addItem(makeItem("i3", "Item C", { topicIds: ["t1"] }));

      expect(getItemsByTopicId("t1")).toHaveLength(3);
    });

    it("reassigns item between topics", () => {
      addTopic(makeTopic("t1", "Rust"));
      addTopic(makeTopic("t2", "Go"));
      addItem(makeItem("i1", "Video", { topicIds: ["t1"] }));

      updateItem("i1", { topicIds: ["t2"] });
      expect(getItemsByTopicId("t1")).toHaveLength(0);
      expect(getItemsByTopicId("t2")).toHaveLength(1);
    });
  });

  // ── LT-03: URL enrichment fields ─────────────────────────────────────

  describe("LT-03: URL enrichment fields", () => {
    it("stores enrichment metadata on URL items", () => {
      addItem(makeItem("i1", "Rust in 100 Seconds", {
        url: "https://youtube.com/watch?v=abc123",
        category: "video",
        tags: ["rust", "intro"],
        duration: 100,
        thumbnail: "https://img.youtube.com/vi/abc123/0.jpg",
      }));

      const item = getItemById("i1")!;
      expect(item.url).toBe("https://youtube.com/watch?v=abc123");
      expect(item.category).toBe("video");
      expect(item.tags).toEqual(["rust", "intro"]);
      expect(item.duration).toBe(100);
      expect(item.thumbnail).toBe("https://img.youtube.com/vi/abc123/0.jpg");
    });

    it("supports all content categories", () => {
      const categories = ["video", "article", "paper", "repo", "podcast", "doc", "other"] as const;
      categories.forEach((cat, i) => {
        addItem(makeItem(`i${i}`, `Item ${cat}`, { category: cat }));
        expect(getItemById(`i${i}`)?.category).toBe(cat);
      });
    });
  });

  // ── LT-04: Manual duration on non-URL items ──────────────────────────

  describe("LT-04: Manual duration", () => {
    it("stores duration on manual (non-URL) items", () => {
      addItem(makeItem("i1", "Read Chapter 1", {
        url: "",
        category: "article",
        duration: 1800, // 30 minutes
      }));

      expect(getItemById("i1")?.duration).toBe(1800);
    });

    it("duration is optional", () => {
      addItem(makeItem("i1", "Practice exercise"));
      expect(getItemById("i1")?.duration).toBeUndefined();
    });
  });

  // ── LT-05: Topic time = sum of subtask durations ─────────────────────

  describe("LT-05: Topic time from subtasks", () => {
    it("calculates remaining time from unread item durations", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "V1", { topicIds: ["t1"], duration: 600 }));
      addItem(makeItem("i2", "V2", { topicIds: ["t1"], duration: 900 }));
      addItem(makeItem("i3", "Done", { topicIds: ["t1"], duration: 300, status: "done" }));

      const items = getItemsByTopicId("t1");
      const remaining = items
        .filter((i) => i.status === "unread")
        .reduce((sum, i) => sum + (i.duration ?? 0), 0);

      expect(remaining).toBe(1500); // 600 + 900, not the done item
    });
  });

  // ── LT-06: Manual topic estimate ─────────────────────────────────────

  describe("LT-06: Topic estimatedSeconds", () => {
    it("stores manual time estimate on topic", () => {
      addTopic(makeTopic("t1", "Rust", { estimatedSeconds: 36000 })); // 10h
      expect(getTopicById("t1")?.estimatedSeconds).toBe(36000);
    });

    it("updates estimate", () => {
      addTopic(makeTopic("t1", "Rust", { estimatedSeconds: 36000 }));
      updateTopic("t1", { estimatedSeconds: 72000 });
      expect(getTopicById("t1")?.estimatedSeconds).toBe(72000);
    });

    it("progress uses estimate when set", () => {
      addTopic(makeTopic("t1", "Rust", { estimatedSeconds: 3600, timeSpent: 1800 }));
      const topic = getTopicById("t1")!;
      const remaining = Math.max(0, (topic.estimatedSeconds ?? 0) - topic.timeSpent);
      const pct = Math.round((topic.timeSpent / (topic.timeSpent + remaining)) * 100);
      expect(pct).toBe(50);
    });
  });

  // ── LT-07: Sync-related fields ───────────────────────────────────────

  describe("LT-07: Sync fields", () => {
    it("topic has all required fields for sync", () => {
      addTopic(makeTopic("t1", "Rust"));
      const topic = getTopicById("t1")!;
      expect(topic.id).toBeDefined();
      expect(topic.createdAt).toBeDefined();
      expect(topic.sortOrder).toBeDefined();
    });

    it("item has all required fields for sync", () => {
      addItem(makeItem("i1", "Item"));
      const item = getItemById("i1")!;
      expect(item.id).toBeDefined();
      expect(item.addedAt).toBeDefined();
      expect(item.sortOrder).toBeDefined();
    });
  });

  // ── LT-09: Items without topics ──────────────────────────────────────

  describe("LT-09: Standalone items", () => {
    it("items can exist without topic assignment", () => {
      addItem(makeItem("i1", "Standalone"));
      const item = getItemById("i1")!;
      expect(item.topicIds).toBeUndefined();
      expect(readItems()).toHaveLength(1);
    });

    it("items with empty topicIds are not returned by topic query", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Standalone"));
      addItem(makeItem("i2", "Assigned", { topicIds: ["t1"] }));

      expect(getItemsByTopicId("t1")).toHaveLength(1);
      expect(readItems()).toHaveLength(2);
    });
  });

  // ── Priority scores ──────────────────────────────────────────────────

  describe("Priority scores (1-5)", () => {
    it("stores and retrieves priority", () => {
      addTopic(makeTopic("t1", "Critical", { priority: 5 }));
      addTopic(makeTopic("t2", "Low", { priority: 1 }));

      expect(getTopicById("t1")?.priority).toBe(5);
      expect(getTopicById("t2")?.priority).toBe(1);
    });

    it("updates priority", () => {
      addTopic(makeTopic("t1", "Topic", { priority: 3 }));
      updateTopic("t1", { priority: 5 });
      expect(getTopicById("t1")?.priority).toBe(5);
    });
  });
});
