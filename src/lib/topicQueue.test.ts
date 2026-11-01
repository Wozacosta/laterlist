import { describe, it, expect } from "vitest";
import type { Item, Topic } from "@/db";
import { nextByTopic, replaceTopic, topicLearned, topicQueue, topicSnoozed } from "./topicQueue";

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

describe("nextByTopic", () => {
  const topic = (id: string, sortOrder: number, status = "active") => ({ id, name: id, sortOrder, status }) as Topic;
  const queued = (id: string, topicIds: string[], patch: Partial<Item> = {}) =>
    item(id, { status: "unread", topicIds, sortOrder: 1, ...patch });

  it("gives one item per active topic, in sidebar order", () => {
    const rows = nextByTopic(
      [topic("b", 2), topic("a", 1), topic("done", 3, "completed")],
      [queued("x", ["a"]), queued("y", ["b"]), queued("z", ["done"])]
    );

    expect(rows.map((row) => [row.topic.id, row.item.id])).toEqual([["a", "x"], ["b", "y"]]);
  });

  it("puts started items first", () => {
    const rows = nextByTopic(
      [topic("a", 1), topic("b", 2)],
      [queued("x", ["a"]), queued("y", ["b"], { progress: "video 7" })]
    );

    expect(rows[0].item.id).toBe("y");
  });

  it("doesn't show an item in two topics twice", () => {
    const rows = nextByTopic(
      [topic("a", 1), topic("b", 2)],
      [queued("both", ["a", "b"], { sortOrder: 2 }), queued("y", ["b"])]
    );

    expect(rows.map((row) => row.item.id)).toEqual(["both", "y"]);
  });

  it("skips topics with nothing to do", () => {
    expect(nextByTopic([topic("a", 1)], [])).toEqual([]);
  });
});
