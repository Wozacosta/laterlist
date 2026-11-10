import { describe, it, expect } from "vitest";
import { FOCUS_LINE, reorderTopics } from "./reorderTopics";

const topics = [
  { id: "a", sortOrder: 10 },
  { id: "b", sortOrder: 20 },
  { id: "c", sortOrder: 30 },
  { id: "d", sortOrder: 40 },
];

function order(updates: { id: string; sortOrder: number }[]) {
  const merged = topics.map((topic) => updates.find((u) => u.id === topic.id) ?? topic);
  return merged.sort((a, b) => a.sortOrder - b.sortOrder).map((topic) => topic.id);
}

describe("reorderTopics", () => {
  it("moves a topic up", () => {
    expect(order(reorderTopics(topics, "c", "a"))).toEqual(["c", "a", "b", "d"]);
  });

  it("moves a topic down", () => {
    expect(order(reorderTopics(topics, "a", "c"))).toEqual(["b", "c", "a", "d"]);
  });

  it("only writes the rows that changed", () => {
    expect(reorderTopics(topics, "b", "c").map((u) => u.id).sort()).toEqual(["b", "c"]);
  });

  it("does nothing when dropped on itself or on something unknown", () => {
    expect(reorderTopics(topics, "b", "b")).toEqual([]);
    expect(reorderTopics(topics, "b", "gone")).toEqual([]);
  });

  it("gives every topic a clear place when sort orders are equal", () => {
    const tied = [
      { id: "a", sortOrder: 5 },
      { id: "b", sortOrder: 5 },
      { id: "c", sortOrder: 5 },
    ];

    const updates = reorderTopics(tied, "c", "a");
    const final = tied.map((topic) => updates.find((u) => u.id === topic.id)?.sortOrder ?? topic.sortOrder);

    expect(new Set(final).size).toBe(3);
  });
});

describe("the Focus line", () => {
  const split = [
    { id: "a", sortOrder: 10, focus: true },
    { id: "b", sortOrder: 20, focus: true },
    { id: "c", sortOrder: 30 },
    { id: "d", sortOrder: 40 },
  ];

  it("adds a topic to Focus when dragged above it", () => {
    const updates = reorderTopics(split, "d", FOCUS_LINE);
    expect(updates.find((u) => u.id === "d")).toMatchObject({ focus: true, sortOrder: 30 });
    expect(updates.find((u) => u.id === "c")).toEqual({ id: "c", sortOrder: 40 });
  });

  it("takes a topic out of Focus when dragged below it", () => {
    expect(reorderTopics(split, "b", FOCUS_LINE)).toEqual([{ id: "b", sortOrder: 20, focus: false }]);
  });

  it("moves a Later topic to the top of Focus", () => {
    const updates = reorderTopics(split, "c", "a");
    expect(updates.find((u) => u.id === "c")).toMatchObject({ focus: true, sortOrder: 10 });
  });

  it("leaves focus alone for a move inside a group", () => {
    expect(reorderTopics(split, "a", "b").every((u) => !("focus" in u))).toBe(true);
    expect(reorderTopics(split, "d", "c").every((u) => !("focus" in u))).toBe(true);
  });

  it("fills an empty Focus group", () => {
    const later = [{ id: "a", sortOrder: 1 }, { id: "b", sortOrder: 2 }];
    expect(reorderTopics(later, "b", FOCUS_LINE)).toContainEqual({ id: "b", sortOrder: 1, focus: true });
  });

  it("never drags the line itself", () => {
    expect(reorderTopics(split, FOCUS_LINE, "a")).toEqual([]);
  });
});
