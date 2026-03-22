/**
 * E2E Test: Topic Lifecycle (LT-80)
 *
 * Tests the full flow: create topic → add subtasks (URL + manual) →
 * mark a subtask done → verify time is logged via the REST API layer.
 *
 * Uses the server-side store directly (same as API routes) to avoid
 * needing a running HTTP server.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  readTopics,
  writeTopics,
  addTopic,
  getTopicById,
  updateTopic,
  deleteTopic,
  readItems,
  writeItems,
  addItem,
  getItemById,
  getItemsByTopicId,
  updateItem,
  deleteItem,
  readTimeLogs,
  writeTimeLogs,
  logTimeToTopic,
  getTimeLogsByTopicId,
} from "@/lib/server/store";
import type { Topic, Item } from "@/db";

describe("Topic Lifecycle E2E (LT-80)", () => {
  beforeEach(() => {
    // Clear all data before each test
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  it("creates a topic with default values", () => {
    const topic: Topic = {
      id: `top_test_${Date.now()}`,
      name: "Learn Rust",
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 4,
      currentInterval: 1,
    };

    addTopic(topic);

    const found = getTopicById(topic.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Learn Rust");
    expect(found!.status).toBe("active");
    expect(found!.priority).toBe(4);
    expect(found!.timeSpent).toBe(0);
  });

  it("adds URL and manual subtasks to a topic", () => {
    // Create topic
    const topic: Topic = {
      id: "top_subtask_test",
      name: "Rust Basics",
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 3,
      currentInterval: 1,
    };
    addTopic(topic);

    // Add URL subtask (video)
    const urlItem: Item = {
      id: "itm_url_1",
      title: "Rust in 100 Seconds",
      url: "https://www.youtube.com/watch?v=5C_HPTJg5ek",
      category: "video",
      tags: ["rust", "intro"],
      duration: 100,
      addedAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "unread",
      topicIds: [topic.id],
    };
    addItem(urlItem);

    // Add manual subtask (no URL)
    const manualItem: Item = {
      id: "itm_manual_1",
      title: "Read chapter 1 of The Rust Book",
      url: "",
      category: "article",
      tags: ["rust", "book"],
      duration: 1800,
      addedAt: new Date().toISOString(),
      sortOrder: Date.now() + 1,
      status: "unread",
      topicIds: [topic.id],
    };
    addItem(manualItem);

    // Verify subtasks are assigned to the topic
    const topicItems = getItemsByTopicId(topic.id);
    expect(topicItems).toHaveLength(2);
    expect(topicItems.map((i) => i.title).sort()).toEqual([
      "Read chapter 1 of The Rust Book",
      "Rust in 100 Seconds",
    ]);
  });

  it("marks a subtask done and verifies time is logged", () => {
    // Create topic
    const topic: Topic = {
      id: "top_done_test",
      name: "Rust Time Test",
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 3,
      currentInterval: 1,
    };
    addTopic(topic);

    // Add subtask with duration
    const item: Item = {
      id: "itm_done_test",
      title: "Watch Rust Video",
      url: "https://example.com/video",
      category: "video",
      tags: [],
      duration: 600, // 10 minutes
      addedAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "unread",
      topicIds: [topic.id],
    };
    addItem(item);

    // Mark as done
    updateItem(item.id, {
      status: "done",
      doneAt: new Date().toISOString(),
    });

    // Verify item is marked done
    const updatedItem = getItemById(item.id);
    expect(updatedItem!.status).toBe("done");
    expect(updatedItem!.doneAt).toBeDefined();

    // Log time to topic (simulates what the frontend does on markDone)
    logTimeToTopic(topic.id, item.duration!, "done");

    // Verify time was logged
    const updatedTopic = getTopicById(topic.id);
    expect(updatedTopic!.timeSpent).toBe(600);

    // Verify time log entry was created
    const logs = getTimeLogsByTopicId(topic.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].seconds).toBe(600);
    expect(logs[0].source).toBe("done");

    // Verify SR clock was reset
    expect(updatedTopic!.lastActivityDate).toBeDefined();
    expect(updatedTopic!.currentInterval).toBe(1);
  });

  it("full lifecycle: create → add items → complete items → log time → complete topic", () => {
    // Step 1: Create topic
    const topic: Topic = {
      id: "top_lifecycle",
      name: "Full Lifecycle Test",
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 5,
      estimatedSeconds: 3600,
      currentInterval: 1,
    };
    addTopic(topic);

    // Step 2: Add multiple items
    const items: Item[] = [
      {
        id: "itm_lc_1",
        title: "Video 1",
        url: "https://example.com/v1",
        category: "video",
        tags: [],
        duration: 300,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now(),
        status: "unread",
        topicIds: ["top_lifecycle"],
      },
      {
        id: "itm_lc_2",
        title: "Article 1",
        url: "https://example.com/a1",
        category: "article",
        tags: [],
        duration: 900,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now() + 1,
        status: "unread",
        topicIds: ["top_lifecycle"],
      },
      {
        id: "itm_lc_3",
        title: "Practice exercise",
        url: "",
        category: "other",
        tags: [],
        duration: 1800,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now() + 2,
        status: "unread",
        topicIds: ["top_lifecycle"],
      },
    ];
    items.forEach(addItem);

    expect(getItemsByTopicId("top_lifecycle")).toHaveLength(3);

    // Step 3: Complete first two items and log time
    updateItem("itm_lc_1", { status: "done", doneAt: new Date().toISOString() });
    logTimeToTopic("top_lifecycle", 300, "done");

    updateItem("itm_lc_2", { status: "done", doneAt: new Date().toISOString() });
    logTimeToTopic("top_lifecycle", 900, "done");

    // Verify accumulated time
    let topicState = getTopicById("top_lifecycle")!;
    expect(topicState.timeSpent).toBe(1200); // 300 + 900

    // Step 4: Log manual time
    logTimeToTopic("top_lifecycle", 600, "manual");
    topicState = getTopicById("top_lifecycle")!;
    expect(topicState.timeSpent).toBe(1800); // 1200 + 600

    // Step 5: Verify time logs
    const allLogs = getTimeLogsByTopicId("top_lifecycle");
    expect(allLogs).toHaveLength(3);
    expect(allLogs.filter((l) => l.source === "done")).toHaveLength(2);
    expect(allLogs.filter((l) => l.source === "manual")).toHaveLength(1);

    // Step 6: Complete last item and topic
    updateItem("itm_lc_3", { status: "done", doneAt: new Date().toISOString() });
    logTimeToTopic("top_lifecycle", 1800, "done");

    updateTopic("top_lifecycle", {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    // Final verification
    topicState = getTopicById("top_lifecycle")!;
    expect(topicState.status).toBe("completed");
    expect(topicState.timeSpent).toBe(3600); // total
    expect(topicState.completedAt).toBeDefined();

    const doneItems = getItemsByTopicId("top_lifecycle").filter(
      (i) => i.status === "done"
    );
    expect(doneItems).toHaveLength(3);
  });

  it("deletes a topic and cleans up", () => {
    const topic: Topic = {
      id: "top_delete_test",
      name: "Delete Me",
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 1,
      currentInterval: 1,
    };
    addTopic(topic);
    expect(readTopics()).toHaveLength(1);

    deleteTopic("top_delete_test");
    expect(readTopics()).toHaveLength(0);
    expect(getTopicById("top_delete_test")).toBeUndefined();
  });
});
