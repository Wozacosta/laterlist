import { describe, it, expect } from "vitest";
import type { Item } from "@/db";
import { pickRecall } from "./recall";

const now = new Date("2026-11-20T12:00:00.000Z").getTime();
const done = (id: string, doneAt: string, patch: Partial<Item> = {}) => ({ id, status: "done", doneAt, ...patch }) as Item;

describe("pickRecall", () => {
  it("picks the finished item that's waited longest", () => {
    const items = [done("new", "2026-11-10T00:00:00.000Z"), done("old", "2026-11-01T00:00:00.000Z")];

    expect(pickRecall(items, now)?.id).toBe("old");
  });

  it("counts a past recall as the last time it was seen", () => {
    const items = [
      done("recalled", "2026-11-01T00:00:00.000Z", { recalledAt: "2026-11-15T00:00:00.000Z" }),
      done("waiting", "2026-11-05T00:00:00.000Z"),
    ];

    expect(pickRecall(items, now)?.id).toBe("waiting");
  });

  it("leaves anything finished in the last three days alone", () => {
    expect(pickRecall([done("fresh", "2026-11-19T00:00:00.000Z")], now)).toBeNull();
  });

  it("stops after one a day", () => {
    const items = [
      done("today", "2026-11-01T00:00:00.000Z", { recalledAt: "2026-11-20T09:00:00.000Z" }),
      done("waiting", "2026-11-05T00:00:00.000Z"),
    ];

    expect(pickRecall(items, now)).toBeNull();
  });

  it("ignores unread items", () => {
    expect(pickRecall([{ id: "a", status: "unread" } as Item], now)).toBeNull();
  });
});
