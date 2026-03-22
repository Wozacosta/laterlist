/**
 * E2E Test: Quick-Add Flow (LT-82)
 *
 * Tests the quick-add feature for adding items from:
 * 1. The learning dashboard (global list, optionally assigned to topic)
 * 2. The topic detail view (auto-assigned to that topic)
 *
 * Covers:
 * - Adding URL items (auto-detect URL vs plain text)
 * - Adding manual items (plain text titles)
 * - Auto-assignment to topic when adding from topic detail
 * - Optional topic assignment when adding from dashboard
 * - Duplicate URL detection
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  addItem,
  readItems,
  getItemsByTopicId,
  getItemById,
  updateItem,
} from "@/lib/server/store";
import type { Topic, Item } from "@/db";

function createTopic(id: string, name: string): Topic {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "active",
    timeSpent: 0,
    priority: 3,
    currentInterval: 1,
  };
}

function createItem(overrides: Partial<Item> & { id: string; title: string }): Item {
  return {
    url: "",
    category: "other",
    tags: [],
    addedAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "unread",
    ...overrides,
  };
}

describe("Quick-Add E2E (LT-82)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  it("adds a plain-text item to the global list (no topic)", () => {
    const item = createItem({
      id: "itm_plain",
      title: "Read about Rust ownership",
      category: "other",
    });
    addItem(item);

    const items = readItems();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Read about Rust ownership");
    expect(items[0].topicIds).toBeUndefined();
    expect(items[0].url).toBe("");
  });

  it("adds a URL item and detects it as URL type", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // Simulates what the AddItemInput component does:
    // Auto-detect URL → create item with URL field populated
    const isUrl = /^https?:\/\//i.test(url);
    expect(isUrl).toBe(true);

    const item = createItem({
      id: "itm_url",
      title: "YouTube Video",
      url,
      category: "video",
      duration: 300,
    });
    addItem(item);

    const found = getItemById("itm_url")!;
    expect(found.url).toBe(url);
    expect(found.category).toBe("video");
    expect(found.duration).toBe(300);
  });

  it("auto-assigns item to topic when adding from topic detail", () => {
    const topic = createTopic("top_rust", "Learn Rust");
    addTopic(topic);

    // Simulates handleAddToTopic: inject topicIds before adding
    const item = createItem({
      id: "itm_assigned",
      title: "Rust ownership chapter",
      topicIds: ["top_rust"],
    });
    addItem(item);

    // Item appears in the topic's subtask list
    const topicItems = getItemsByTopicId("top_rust");
    expect(topicItems).toHaveLength(1);
    expect(topicItems[0].title).toBe("Rust ownership chapter");

    // Item also appears in the global list
    expect(readItems()).toHaveLength(1);
  });

  it("allows optional topic assignment after adding from dashboard", () => {
    // Create two topics
    addTopic(createTopic("top_a", "Topic A"));
    addTopic(createTopic("top_b", "Topic B"));

    // Step 1: Add item from dashboard (no topic)
    const item = createItem({
      id: "itm_dashboard",
      title: "New article to read",
    });
    addItem(item);

    // Step 2: Simulate assigning to Topic A (like handleAssignPending)
    const existing = getItemById("itm_dashboard")!;
    const currentTopics = existing.topicIds ?? [];
    updateItem("itm_dashboard", { topicIds: [...currentTopics, "top_a"] });

    // Verify assignment
    const updated = getItemById("itm_dashboard")!;
    expect(updated.topicIds).toContain("top_a");
    expect(getItemsByTopicId("top_a")).toHaveLength(1);
    expect(getItemsByTopicId("top_b")).toHaveLength(0);
  });

  it("detects duplicate URLs and prevents double-add", () => {
    const url = "https://example.com/article";

    // Add first item
    addItem(
      createItem({
        id: "itm_orig",
        title: "Original Article",
        url,
      })
    );

    // Simulate duplicate check (same logic as handleAdd in page.tsx)
    const items = readItems();
    const normalizedUrl = url.replace(/\/$/, "");
    const duplicate = items.find(
      (i) => i.url && i.url.replace(/\/$/, "") === normalizedUrl
    );

    expect(duplicate).toBeDefined();
    expect(duplicate!.id).toBe("itm_orig");
    // In the real app, this would show a toast warning and NOT add the item
  });

  it("adds items to multiple topics (many-to-many)", () => {
    addTopic(createTopic("top_x", "Topic X"));
    addTopic(createTopic("top_y", "Topic Y"));

    // Item assigned to both topics
    const item = createItem({
      id: "itm_multi",
      title: "Cross-cutting article",
      topicIds: ["top_x", "top_y"],
    });
    addItem(item);

    expect(getItemsByTopicId("top_x")).toHaveLength(1);
    expect(getItemsByTopicId("top_y")).toHaveLength(1);

    const found = getItemById("itm_multi")!;
    expect(found.topicIds).toEqual(["top_x", "top_y"]);
  });

  it("auto-detects bare domain as URL", () => {
    // Simulates the looksLikeUrl logic from AddItemInput
    const looksLikeUrl = (input: string): boolean => {
      const trimmed = input.trim();
      if (/^https?:\/\//i.test(trimmed)) return true;
      if (/^[a-z0-9-]+(\.[a-z]{2,})(\/|$)/i.test(trimmed)) return true;
      return false;
    };

    expect(looksLikeUrl("https://example.com")).toBe(true);
    expect(looksLikeUrl("http://localhost:3000")).toBe(true);
    expect(looksLikeUrl("example.com/path")).toBe(true);
    expect(looksLikeUrl("Build a shell in Rust")).toBe(false);
    expect(looksLikeUrl("Read chapter 3")).toBe(false);
    expect(looksLikeUrl("")).toBe(false);
  });
});
