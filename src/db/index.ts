import Dexie from "dexie";
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon";

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

const db = new Dexie("LaterlistDB", { addons: [dexieCloud] }) as Dexie & {
  items: DexieCloudTable<Item, "id">;
};

// Plain "id" key (not "@id") — cloud addon works with manually-generated UUIDs,
// and this avoids a fake-indexeddb v6 incompatibility in tests.
db.version(1).stores({
  items: "id, url, category, status, sortOrder, addedAt",
});

db.cloud.configure({
  databaseUrl: process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL || "",
  requireAuth: false,
  tryUseServiceWorker: false,
});

export { db };
