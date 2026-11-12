import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, type Item } from "@/db";
import { addNoteImages, fitWithin, imageFiles, removeNoteImage } from "./noteImages";

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

afterEach(() => {
  if (db.isOpen()) db.close();
});

const item: Item = {
  id: "itm1",
  url: "https://example.com",
  title: "Example",
  category: "article",
  tags: [],
  addedAt: "2026-11-12T10:00:00.000Z",
  sortOrder: 1,
  status: "unread",
  notes: "a note",
};

describe("fitWithin", () => {
  it("scales the longest side down to the limit and keeps the shape", () => {
    expect(fitWithin(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 });
    expect(fitWithin(1000, 4000, 1600)).toEqual({ width: 400, height: 1600 });
  });

  it("never scales a small image up", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("imageFiles", () => {
  it("keeps only images", () => {
    const png = new File(["x"], "shot.png", { type: "image/png" });
    const text = new File(["x"], "notes.txt", { type: "text/plain" });
    expect(imageFiles([png, text])).toEqual([png]);
    expect(imageFiles(null)).toEqual([]);
  });
});

describe("note images", () => {
  it("adding no files leaves the item untouched", async () => {
    await db.items.add(item);
    await addNoteImages("itm1", []);
    expect((await db.items.get("itm1"))?.noteImages).toBeUndefined();
  });

  it("removes one image and keeps the others and the note", async () => {
    await db.items.add({ ...item, noteImages: ["data:a", "data:b", "data:c"] });
    await removeNoteImage("itm1", 1);
    const saved = await db.items.get("itm1");
    expect(saved?.noteImages).toEqual(["data:a", "data:c"]);
    expect(saved?.notes).toBe("a note");
  });
});
