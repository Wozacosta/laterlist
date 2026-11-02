import { describe, expect, it } from "vitest";
import type { Item } from "@/db";
import { activityByDay, currentStreak, dayKey, entryTopics, monthCells, NO_TOPIC, topicCounts } from "./calendar";

const at = (day: number, hour = 9) => new Date(2026, 10, day, hour).toISOString();

function item(id: string, fields: Partial<Item> = {}): Item {
  return {
    id,
    title: id,
    url: "",
    category: "article",
    tags: [],
    addedAt: at(1),
    sortOrder: 0,
    status: "unread",
    ...fields,
  };
}

describe("dayKey", () => {
  it("uses the local day, even late in the evening", () => {
    expect(dayKey(at(2, 23))).toBe("2026-11-02");
    expect(dayKey(at(2, 0))).toBe("2026-11-02");
  });
});

describe("activityByDay", () => {
  it("files finished items on the day they were done", () => {
    const days = activityByDay([item("a", { status: "done", doneAt: at(3) })]);

    expect(days.get("2026-11-03")?.map((entry) => [entry.item.id, entry.finished])).toEqual([["a", true]]);
  });

  it("ignores a done date on an item that was marked unread again", () => {
    expect(activityByDay([item("a", { doneAt: at(3) })]).size).toBe(0);
  });

  it("shows each day an item was worked on", () => {
    const days = activityByDay([item("a", { workedOn: [at(3), at(5)] })]);

    expect([...days.keys()]).toEqual(["2026-11-03", "2026-11-05"]);
    expect(days.get("2026-11-05")?.[0].finished).toBe(false);
  });

  it("shows an item once a day, as finished if it was", () => {
    const days = activityByDay([
      item("a", { status: "done", doneAt: at(3, 18), workedOn: [at(3, 9), at(3, 12), at(2)] }),
    ]);

    expect(days.get("2026-11-03")).toHaveLength(1);
    expect(days.get("2026-11-03")?.[0].finished).toBe(true);
    expect(days.get("2026-11-02")?.[0].finished).toBe(false);
  });

  it("lists finished items before the ones only worked on", () => {
    const days = activityByDay([item("a", { workedOn: [at(3)] }), item("b", { status: "done", doneAt: at(3) })]);

    expect(days.get("2026-11-03")?.map((entry) => entry.item.id)).toEqual(["b", "a"]);
  });
});

describe("entryTopics", () => {
  const known = new Set(["ai", "web"]);

  it("returns the item's topics", () => {
    expect(entryTopics(item("a", { topicIds: ["ai", "web"] }), known)).toEqual(["ai", "web"]);
  });

  it("groups an item with no topic under No topic", () => {
    expect(entryTopics(item("a"), known)).toEqual([NO_TOPIC]);
    expect(entryTopics(item("a", { topicIds: [] }), known)).toEqual([NO_TOPIC]);
  });

  it("treats a deleted topic as no topic", () => {
    expect(entryTopics(item("a", { topicIds: ["gone"] }), known)).toEqual([NO_TOPIC]);
    expect(entryTopics(item("a", { topicIds: ["gone", "ai"] }), known)).toEqual(["ai"]);
  });
});

describe("topicCounts", () => {
  const known = new Set(["ai", "web"]);
  const entries = (...items: Item[]) => items.map((entry) => ({ item: entry, finished: true }));

  it("puts the busiest topic first", () => {
    const counts = topicCounts(
      entries(item("a", { topicIds: ["web"] }), item("b", { topicIds: ["ai"] }), item("c", { topicIds: ["ai"] })),
      known
    );

    expect(counts).toEqual([{ id: "ai", count: 2 }, { id: "web", count: 1 }]);
  });

  it("counts an item in two topics for both", () => {
    expect(topicCounts(entries(item("a", { topicIds: ["ai", "web"] })), known)).toEqual([
      { id: "ai", count: 1 },
      { id: "web", count: 1 },
    ]);
  });

  it("counts items without a topic", () => {
    expect(topicCounts(entries(item("a")), known)).toEqual([{ id: NO_TOPIC, count: 1 }]);
  });
});

describe("monthCells", () => {
  it("starts on Monday with blanks before the 1st", () => {
    // 1 November 2026 is a Sunday.
    const cells = monthCells(2026, 10);

    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(cells).toHaveLength(36);
    expect(cells.at(-1)).toBe("2026-11-30");
  });

  it("needs no blanks when the month starts on a Monday", () => {
    expect(monthCells(2026, 5)[0]).toBe("2026-06-01");
  });

  it("knows leap years", () => {
    expect(monthCells(2028, 1).at(-1)).toBe("2028-02-29");
  });
});

describe("currentStreak", () => {
  const worked = (...days: number[]) => activityByDay(days.map((day) => item(`i${day}`, { workedOn: [at(day)] })));
  const now = new Date(2026, 10, 10, 12).getTime();

  it("counts the days in a row up to today", () => {
    expect(currentStreak(worked(8, 9, 10), now)).toBe(3);
  });

  it("keeps the streak alive until today is over", () => {
    expect(currentStreak(worked(8, 9), now)).toBe(2);
  });

  it("stops at a gap", () => {
    expect(currentStreak(worked(5, 9, 10), now)).toBe(2);
  });

  it("is zero after a missed day", () => {
    expect(currentStreak(worked(8), now)).toBe(0);
  });
});
