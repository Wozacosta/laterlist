import { describe, expect, it } from "vitest";
import { timeAgo } from "./timeAgo";

const now = new Date(2026, 10, 15, 9, 0).getTime();
const on = (month: number, day: number, year = 2026) => new Date(year, month, day, 23, 30).toISOString();

describe("timeAgo", () => {
  it("counts calendar days, not 24-hour blocks", () => {
    expect(timeAgo(new Date(2026, 10, 15, 1, 0).toISOString(), now)).toBe("today");
    expect(timeAgo(on(10, 14), now)).toBe("yesterday");
    expect(timeAgo(on(10, 12), now)).toBe("3d ago");
  });

  it("moves to weeks, months and years as it gets older", () => {
    expect(timeAgo(on(10, 1), now)).toBe("2w ago");
    expect(timeAgo(on(7, 15), now)).toBe("3mo ago");
    expect(timeAgo(on(9, 15, 2025), now)).toBe("1y ago");
  });

  it("treats a date ahead of this clock as today", () => {
    expect(timeAgo(on(10, 20), now)).toBe("today");
  });
});
