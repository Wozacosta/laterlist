import { describe, it, expect } from "vitest";
import type { Item } from "@/db";
import { replaceTopic, topicLearned, topicQueue, topicSnoozed } from "./topicQueue";

function item(id: string, patch: Partial<Item> = {}): Item {
  return {
    id,
    url: "",
    title: id,
    category: "other",
    tags: [],
    addedAt: "2026-11-01T00:00:00.000Z",
    sortOrder: 0,
    status: "unread",
    topicIds: ["t1"],
    ...patch,
  };
}

describe("topicQueue", () => {
  it("puts the highest sort order first", () => {
    const queue = topicQueue(
      [item("low", { sortOrder: 1 }), item("high", { sortOrder: 2 })],
      "t1"
    );

    expect(queue.map((i) => i.id)).toEqual(["high", "low"]);
  });

  it("leaves out finished items, other topics and items with no topic", () => {
    const queue = topicQueue(
      [
        item("done", { status: "done" }),
        item("other", { topicIds: ["t2"] }),
        item("none", { topicIds: undefined }),
        item("keep"),
      ],
      "t1"
    );

    expect(queue.map((i) => i.id)).toEqual(["keep"]);
  });

  it("includes items that belong to several topics", () => {
    expect(topicQueue([item("both", { topicIds: ["t2", "t1"] })], "t1")).toHaveLength(1);
  });
});

describe("topicLearned", () => {
  it("lists finished items, most recent first", () => {
    const learned = topicLearned(
      [
        item("old", { status: "done", doneAt: "2026-01-01T00:00:00.000Z" }),
        item("new", { status: "done", doneAt: "2026-02-01T00:00:00.000Z" }),
        item("unread"),
      ],
      "t1"
    );

    expect(learned.map((i) => i.id)).toEqual(["new", "old"]);
  });
});

describe("replaceTopic", () => {
  it("swaps the topic and keeps the others", () => {
    expect(replaceTopic(["a", "b"], "a", "c")).toEqual(["c", "b"]);
  });

  it("doesn't duplicate a topic the item is already in", () => {
    expect(replaceTopic(["a", "b"], "a", "b")).toEqual(["b"]);
  });
});

describe("snoozed items", () => {
  const now = new Date("2026-11-01T12:00:00.000Z").getTime();
  const snoozed = (id: string, snoozedUntil?: string | null) =>
    item(id, { status: "unread", topicIds: ["t"], snoozedUntil });

  it("leave the queue until their time", () => {
    const items = [snoozed("waiting", "2026-11-02T12:00:00.000Z"), snoozed("free")];

    expect(topicQueue(items, "t", now).map((i) => i.id)).toEqual(["free"]);
    expect(topicSnoozed(items, "t", now).map((i) => i.id)).toEqual(["waiting"]);
  });

  it("come back once their time has passed, or when cleared", () => {
    const items = [snoozed("past", "2026-10-31T12:00:00.000Z"), snoozed("cleared", null)];

    expect(topicQueue(items, "t", now)).toHaveLength(2);
    expect(topicSnoozed(items, "t", now)).toHaveLength(0);
  });
});
