import { describe, it, expect } from "vitest";
import { isArchived } from "./archive";
import type { Item } from "@/db";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "itm-test",
    url: "https://example.com",
    title: "Test",
    category: "article",
    tags: [],
    addedAt: new Date().toISOString(),
    sortOrder: Date.now(),
    status: "unread",
    ...overrides,
  };
}

const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("isArchived", () => {
  it("returns false for unread item", () => {
    expect(isArchived(makeItem({ status: "unread" }))).toBe(false);
  });

  it("returns false for done item without doneAt", () => {
    expect(isArchived(makeItem({ status: "done", doneAt: undefined }))).toBe(false);
  });

  it("returns false for done item done less than 7 days ago", () => {
    const doneAt = new Date(Date.now() - SIX_DAYS_MS).toISOString();
    expect(isArchived(makeItem({ status: "done", doneAt }))).toBe(false);
  });

  it("returns false for done item done exactly 7 days ago (boundary)", () => {
    const doneAt = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    expect(isArchived(makeItem({ status: "done", doneAt }))).toBe(false);
  });

  it("returns true for done item done more than 7 days ago", () => {
    const doneAt = new Date(Date.now() - EIGHT_DAYS_MS).toISOString();
    expect(isArchived(makeItem({ status: "done", doneAt }))).toBe(true);
  });
});
