import Dexie, { type Table } from "dexie";

export type Category =
  | "video"
  | "article"
  | "paper"
  | "repo"
  | "podcast"
  | "doc"
  | "other";

export interface Item {
  id: string; // "itm" + crypto.randomUUID()
  url: string;
  title: string;
  thumbnail?: string;
  category: Category;
  tags: string[];
  duration?: number; // seconds (video length or article read time)
  addedAt: string; // ISO datetime string
  sortOrder: number; // Date.now() on creation
  status: "unread" | "done";
  doneAt?: string; // ISO datetime string, set when marked done
  notes?: string;
}

const db = new Dexie("LaterlistDB") as Dexie & {
  items: Table<Item, string>;
};

// Note: we use plain "id" (not "@id") for fake-indexeddb test compatibility.
// UUIDs are generated manually in useItems.addItem() with "itm" + crypto.randomUUID().
db.version(1).stores({
  items: "id, url, category, status, sortOrder, addedAt",
});

export { db };
