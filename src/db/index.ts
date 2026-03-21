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

export type GroupColor =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "pink"
  | "gray";

export interface Group {
  id: string; // "grp" + crypto.randomUUID()
  name: string;
  color: GroupColor;
  sortOrder: number;
  collapsed: boolean;
}

export interface Item {
  id: string; // "itm" + crypto.randomUUID()
  url: string;
  title: string;
  thumbnail?: string;
  category: Category;
  tags: string[];
  duration?: number; // seconds
  addedAt: string; // ISO datetime string
  sortOrder: number; // Date.now() on creation
  status: "unread" | "done";
  doneAt?: string; // ISO datetime string
  notes?: string;
  groupId?: string; // optional group membership
  topicIds?: string[]; // optional learning topics (multi-select)
}

export interface Topic {
  id: string; // "top" + crypto.randomUUID()
  name: string;
  createdAt: string; // ISO datetime string
  sortOrder: number; // Date.now() on creation
  status: "active" | "completed";
  completedAt?: string; // ISO datetime string
}

const db = new Dexie("LaterlistDB", { addons: [dexieCloud] }) as Dexie & {
  items: DexieCloudTable<Item, "id">;
  groups: DexieCloudTable<Group, "id">;
  topics: DexieCloudTable<Topic, "id">;
};

db.version(1).stores({
  items: "id, url, category, status, sortOrder, addedAt",
});

db.version(2).stores({
  items: "id, url, category, status, sortOrder, addedAt, groupId",
  groups: "id, sortOrder",
});

db.version(3).stores({
  items: "id, url, category, status, sortOrder, addedAt, groupId, topicId",
  groups: "id, sortOrder",
  topics: "id, sortOrder, status",
});

db.version(4)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
  })
  .upgrade((tx) => {
    return tx
      .table("items")
      .toCollection()
      .modify((item: Record<string, unknown>) => {
        const oldId = item.topicId as string | undefined;
        item.topicIds = oldId ? [oldId] : [];
        delete item.topicId;
      });
  });

db.cloud.configure({
  databaseUrl: process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL || "",
  requireAuth: false,
  tryUseServiceWorker: false,
});

export { db };
