/**
 * Integration Tests: Learning Notes (LT-87)
 *
 * Covers PRD requirements LT-34 through LT-37:
 * - LT-34: Markdown notes on topics
 * - LT-35: "What did you learn?" prompt on item completion (notes on items)
 * - LT-36: Notes rendering (markdown content)
 * - LT-37: Notes CRUD via API
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  addTopic,
  getTopicById,
  updateTopic,
  addItem,
  getItemById,
  updateItem,
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

describe("Learning Notes Integration (LT-87)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  // ── LT-34: Markdown notes on topics ──────────────────────────────────

  describe("LT-34: Topic markdown notes", () => {
    it("creates topic with no notes by default", () => {
      addTopic(makeTopic("t1", "Rust"));
      expect(getTopicById("t1")!.notes).toBeUndefined();
    });

    it("sets markdown notes on a topic", () => {
      addTopic(makeTopic("t1", "Rust"));
      const markdown = "# Ownership\n\n- Every value has a single owner\n- When owner goes out of scope, value is dropped\n\n```rust\nlet s1 = String::from(\"hello\");\nlet s2 = s1; // s1 is moved\n```";

      updateTopic("t1", { notes: markdown });

      const topic = getTopicById("t1")!;
      expect(topic.notes).toBe(markdown);
      expect(topic.notes).toContain("# Ownership");
      expect(topic.notes).toContain("```rust");
    });

    it("updates existing notes", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "Initial notes" }));
      updateTopic("t1", { notes: "Updated notes with **bold**" });

      expect(getTopicById("t1")!.notes).toBe("Updated notes with **bold**");
    });

    it("clears notes by setting to undefined", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "Some notes" }));
      updateTopic("t1", { notes: undefined });

      expect(getTopicById("t1")!.notes).toBeUndefined();
    });

    it("preserves notes through topic status changes", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "My learning notes" }));

      // Complete topic
      updateTopic("t1", { status: "completed", completedAt: new Date().toISOString() });
      expect(getTopicById("t1")!.notes).toBe("My learning notes");

      // Reopen topic
      updateTopic("t1", { status: "active", completedAt: undefined });
      expect(getTopicById("t1")!.notes).toBe("My learning notes");
    });
  });

  // ── LT-35: "What did you learn?" prompt ──────────────────────────────

  describe("LT-35: Item completion notes", () => {
    it("item has no notes by default", () => {
      addItem(makeItem("i1", "Watch video"));
      expect(getItemById("i1")!.notes).toBeUndefined();
    });

    it("adds notes to item on completion (simulates 'what did you learn?')", () => {
      addItem(makeItem("i1", "Watch Rust ownership video", {
        topicIds: ["t1"],
        duration: 600,
      }));

      // Simulate: user types notes then marks done
      const learningNote = "Key takeaway: ownership transfers on assignment, use & for borrowing";
      updateItem("i1", { notes: learningNote });
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });

      const item = getItemById("i1")!;
      expect(item.status).toBe("done");
      expect(item.notes).toBe(learningNote);
    });

    it("item can be marked done without notes (skip)", () => {
      addItem(makeItem("i1", "Quick read"));

      // Mark done without notes
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });

      const item = getItemById("i1")!;
      expect(item.status).toBe("done");
      expect(item.notes).toBeUndefined();
    });

    it("notes persist after marking done", () => {
      addItem(makeItem("i1", "Read article"));
      updateItem("i1", { notes: "Learned about lifetimes" });
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });

      expect(getItemById("i1")!.notes).toBe("Learned about lifetimes");
    });

    it("notes can be updated after completion", () => {
      addItem(makeItem("i1", "Video"));
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });
      updateItem("i1", { notes: "Added notes after the fact" });

      expect(getItemById("i1")!.notes).toBe("Added notes after the fact");
    });
  });

  // ── LT-36: Notes rendering (markdown) ────────────────────────────────

  describe("LT-36: Markdown content support", () => {
    it("supports headings", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "# Heading 1\n## Heading 2\n### Heading 3",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("# Heading 1");
      expect(notes).toContain("## Heading 2");
    });

    it("supports code blocks", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "```typescript\nconst x: number = 42;\n```",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("```typescript");
    });

    it("supports lists", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "- Item A\n- Item B\n  - Nested\n1. Numbered\n2. List",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("- Item A");
      expect(notes).toContain("1. Numbered");
    });

    it("supports links and emphasis", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "Visit [Rust docs](https://doc.rust-lang.org) for **bold** and *italic* text",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("[Rust docs]");
      expect(notes).toContain("**bold**");
    });

    it("supports multi-line content with paragraphs", () => {
      const content = "First paragraph about ownership.\n\nSecond paragraph about borrowing.\n\nThird about lifetimes.";
      addTopic(makeTopic("t1", "Test", { notes: content }));
      expect(getTopicById("t1")!.notes).toBe(content);
    });
  });

  // ── LT-37: Notes CRUD via store ──────────────────────────────────────

  describe("LT-37: Notes CRUD operations", () => {
    it("read notes from topic", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "My notes" }));
      expect(getTopicById("t1")!.notes).toBe("My notes");
    });

    it("read notes from item", () => {
      addItem(makeItem("i1", "Video", { notes: "Item notes" }));
      expect(getItemById("i1")!.notes).toBe("Item notes");
    });

    it("create notes on topic (update from undefined)", () => {
      addTopic(makeTopic("t1", "Rust"));
      expect(getTopicById("t1")!.notes).toBeUndefined();

      updateTopic("t1", { notes: "New notes" });
      expect(getTopicById("t1")!.notes).toBe("New notes");
    });

    it("create notes on item (update from undefined)", () => {
      addItem(makeItem("i1", "Video"));
      expect(getItemById("i1")!.notes).toBeUndefined();

      updateItem("i1", { notes: "New item notes" });
      expect(getItemById("i1")!.notes).toBe("New item notes");
    });

    it("update existing notes", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "v1" }));
      updateTopic("t1", { notes: "v2" });
      expect(getTopicById("t1")!.notes).toBe("v2");
    });

    it("delete notes (set to undefined)", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "To be deleted" }));
      updateTopic("t1", { notes: undefined });
      expect(getTopicById("t1")!.notes).toBeUndefined();
    });
  });
});
