import { describe, it, expect } from "vitest";
import { reorderItems } from "./reorderItems";

const rows = [
  { id: "a", sortOrder: 900 },
  { id: "b", sortOrder: 500 },
  { id: "c", sortOrder: 100 },
];

describe("reorderItems", () => {
  it("reuses the slots of the rows in view", () => {
    expect(reorderItems(rows, "c", "a")).toEqual([
      { id: "c", sortOrder: 900 },
      { id: "a", sortOrder: 500 },
      { id: "b", sortOrder: 100 },
    ]);
  });

  it("writes only the rows that moved", () => {
    expect(reorderItems(rows, "b", "a").map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("stays between rows outside a filtered view", () => {
    const filtered = reorderItems(rows, "a", "c");

    expect(Math.max(...filtered.map((row) => row.sortOrder))).toBe(900);
    expect(Math.min(...filtered.map((row) => row.sortOrder))).toBe(100);
  });

  it("breaks ties so the new order holds", () => {
    const tied = [
      { id: "a", sortOrder: 5 },
      { id: "b", sortOrder: 5 },
    ];

    expect(reorderItems(tied, "b", "a")).toEqual([{ id: "a", sortOrder: 4 }]);
  });

  it("does nothing when a row is dropped on itself", () => {
    expect(reorderItems(rows, "a", "a")).toEqual([]);
  });
});
