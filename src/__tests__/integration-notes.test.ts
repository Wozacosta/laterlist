/**
 * Integration Tests: Learning Notes (LT-87)
 *
 * Covers PRD requirements LT-34 through LT-37:
 * - LT-34: Each subtask and topic can have markdown notes attached
 * - LT-35: "What did you learn?" prompt on item completion (notes on items)
 * - LT-36: Study queue surfaces most recent notes for context
 * - LT-37: Notes support standard markdown (headings, lists, code blocks, links)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  writeTopics,
  writeItems,
  writeTimeLogs,
  readItems,
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

/**
 * Mirrors the latestNote logic from useStudyQueue.ts (lines 40-79):
 * For a given topic, finds the most recent item note (by doneAt/addedAt),
 * falling back to topic-level notes if no item notes exist.
 */
function buildLatestNote(topic: Topic, items: Item[]): string | undefined {
  let latestNote: string | undefined;
  let latestDate: string | undefined;

  for (const item of items) {
    if (!item.notes || !item.topicIds?.includes(topic.id)) continue;
    const itemDate = item.doneAt ?? item.addedAt;
    if (!latestDate || itemDate > latestDate) {
      latestDate = itemDate;
      latestNote = item.notes;
    }
  }

  return latestNote ?? topic.notes;
}

describe("Learning Notes Integration (LT-87)", () => {
  beforeEach(() => {
    writeTopics([]);
    writeItems([]);
    writeTimeLogs([]);
  });

  // ── LT-34: Each subtask and topic can have markdown notes attached ────

  describe("LT-34: Markdown notes on topics and items", () => {
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

    it("sets markdown notes on an item (subtask)", () => {
      addItem(makeItem("i1", "Watch video", { topicIds: ["t1"] }));
      updateItem("i1", { notes: "Learned about **borrow checker**" });

      expect(getItemById("i1")!.notes).toBe("Learned about **borrow checker**");
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

      updateTopic("t1", { status: "completed", completedAt: new Date().toISOString() });
      expect(getTopicById("t1")!.notes).toBe("My learning notes");

      updateTopic("t1", { status: "active", completedAt: undefined });
      expect(getTopicById("t1")!.notes).toBe("My learning notes");
    });
  });

  // ── LT-35: "What did you learn?" prompt on item completion ─────────────

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

      const learningNote = "Key takeaway: ownership transfers on assignment, use & for borrowing";
      updateItem("i1", { notes: learningNote });
      updateItem("i1", { status: "done", doneAt: new Date().toISOString() });

      const item = getItemById("i1")!;
      expect(item.status).toBe("done");
      expect(item.notes).toBe(learningNote);
    });

    it("item can be marked done without notes (prompt is optional)", () => {
      addItem(makeItem("i1", "Quick read"));
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

  // ── LT-36: Study queue surfaces most recent notes ──────────────────────

  describe("LT-36: Study queue surfaces latest notes for context", () => {
    it("shows topic-level notes when no item notes exist", () => {
      const topic = makeTopic("t1", "Rust", { notes: "Topic-level overview of ownership" });
      addTopic(topic);

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBe("Topic-level overview of ownership");
    });

    it("shows most recent item note instead of topic note", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "General topic notes" }));
      addItem(makeItem("i1", "Video 1", {
        topicIds: ["t1"],
        notes: "Learned about ownership",
        doneAt: "2026-03-20T10:00:00.000Z",
      }));

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBe("Learned about ownership");
    });

    it("picks the most recent item note by doneAt", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Video 1", {
        topicIds: ["t1"],
        notes: "Older note about ownership",
        doneAt: "2026-03-18T10:00:00.000Z",
      }));
      addItem(makeItem("i2", "Video 2", {
        topicIds: ["t1"],
        notes: "Latest note about borrowing",
        doneAt: "2026-03-20T10:00:00.000Z",
      }));

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBe("Latest note about borrowing");
    });

    it("falls back to addedAt when item has no doneAt", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Article", {
        topicIds: ["t1"],
        notes: "Earlier note",
        addedAt: "2026-03-15T10:00:00.000Z",
      }));
      addItem(makeItem("i2", "Tutorial", {
        topicIds: ["t1"],
        notes: "More recent note",
        addedAt: "2026-03-20T10:00:00.000Z",
      }));

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBe("More recent note");
    });

    it("returns undefined when topic and items have no notes", () => {
      addTopic(makeTopic("t1", "Rust"));
      addItem(makeItem("i1", "Video", { topicIds: ["t1"] }));

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBeUndefined();
    });

    it("ignores items not assigned to the topic", () => {
      addTopic(makeTopic("t1", "Rust", { notes: "Rust notes" }));
      addItem(makeItem("i1", "Unrelated video", {
        topicIds: ["t2"],
        notes: "This belongs to another topic",
        doneAt: "2026-03-20T10:00:00.000Z",
      }));

      const latestNote = buildLatestNote(getTopicById("t1")!, readItems());
      expect(latestNote).toBe("Rust notes");
    });
  });

  // ── LT-37: Notes support standard markdown ─────────────────────────────

  describe("LT-37: Standard markdown support", () => {
    it("supports headings (h1, h2, h3)", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "# Heading 1\n## Heading 2\n### Heading 3",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("# Heading 1");
      expect(notes).toContain("## Heading 2");
      expect(notes).toContain("### Heading 3");
    });

    it("supports fenced code blocks with language", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "```typescript\nconst x: number = 42;\n```",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("```typescript");
      expect(notes).toContain("const x: number = 42;");
    });

    it("supports ordered and unordered lists", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "- Item A\n- Item B\n  - Nested\n1. Numbered\n2. List",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("- Item A");
      expect(notes).toContain("  - Nested");
      expect(notes).toContain("1. Numbered");
    });

    it("supports links and emphasis", () => {
      addTopic(makeTopic("t1", "Test", {
        notes: "Visit [Rust docs](https://doc.rust-lang.org) for **bold** and *italic* text",
      }));
      const notes = getTopicById("t1")!.notes!;
      expect(notes).toContain("[Rust docs](https://doc.rust-lang.org)");
      expect(notes).toContain("**bold**");
      expect(notes).toContain("*italic*");
    });

    it("supports multi-line paragraphs", () => {
      const content = "First paragraph about ownership.\n\nSecond paragraph about borrowing.\n\nThird about lifetimes.";
      addTopic(makeTopic("t1", "Test", { notes: content }));
      expect(getTopicById("t1")!.notes).toBe(content);
    });

    it("supports inline code", () => {
      addItem(makeItem("i1", "Test", {
        notes: "Use `let mut` for mutable bindings",
      }));
      expect(getItemById("i1")!.notes).toContain("`let mut`");
    });
  });
});
