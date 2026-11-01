import { describe, it, expect } from "vitest";
import type { Item } from "@/db";
import { missingItems } from "./missingItems";

function item(id: string, url = "", patch: object = {}): Item {
  return {
    id,
    url,
    title: id,
    category: "other",
    tags: [],
    addedAt: "2026-11-01T00:00:00.000Z",
    sortOrder: 0,
    status: "unread",
    ...patch,
  };
}

describe("missingItems", () => {
  it("keeps only items the list doesn't have", () => {
    const backup = [item("a"), item("b")];

    expect(missingItems(backup, [item("a")]).map((i) => i.id)).toEqual(["b"]);
  });

  it("never changes an existing item, even if the backup's copy differs", () => {
    const backup = [item("a", "", { title: "Old title", status: "unread" })];

    expect(missingItems(backup, [item("a", "", { status: "done" })])).toEqual([]);
  });

  it("treats the same link under another id as already saved", () => {
    const backup = [item("new", "https://example.com/a/")];

    expect(missingItems(backup, [item("old", "https://example.com/a")])).toEqual([]);
  });

  it("doesn't treat items with no link as the same item", () => {
    expect(missingItems([item("a"), item("b")], [item("c")])).toHaveLength(2);
  });

  it("drops repeats inside the backup", () => {
    const backup = [item("a", "https://example.com"), item("b", "https://example.com/")];

    expect(missingItems(backup, []).map((i) => i.id)).toEqual(["a"]);
  });

  it("removes sync fields from another account", () => {
    const backup = [item("a", "", { realmId: "someone", owner: "someone" })];

    expect(missingItems(backup, [])[0]).not.toHaveProperty("realmId");
    expect(missingItems(backup, [])[0]).not.toHaveProperty("owner");
  });
});
