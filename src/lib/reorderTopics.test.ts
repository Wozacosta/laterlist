import { describe, it, expect } from "vitest";
import { reorderTopics } from "./reorderTopics";

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
