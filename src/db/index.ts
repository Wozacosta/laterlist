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
  timeSpent: number; // seconds of learning time logged
  priority: number; // 1-5 priority score (1=lowest, 5=critical)
  estimatedSeconds?: number; // total time budget for this topic (e.g. 30h = 108000)
  lastActivityDate?: string; // ISO datetime — last time user engaged with this topic (SR clock)
  currentInterval: number; // days until next review (SR interval, starts at 1)
}

export interface TimeLog {
  id: string; // "log" + crypto.randomUUID()
  topicId: string;
  seconds: number;
  loggedAt: string; // ISO datetime string
  source: "manual" | "done"; // how time was logged
}

export interface Settings {
  id: string; // singleton "settings"
  dailyGoalMinutes: number; // 0 = no goal set
}

const db = new Dexie("LaterlistDB", { addons: [dexieCloud] }) as Dexie & {
  items: DexieCloudTable<Item, "id">;
  groups: DexieCloudTable<Group, "id">;
  topics: DexieCloudTable<Topic, "id">;
  timeLogs: DexieCloudTable<TimeLog, "id">;
  settings: DexieCloudTable<Settings, "id">;
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

db.version(5)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
  })
  .upgrade((tx) => {
    return tx
      .table("topics")
      .toCollection()
      .modify((topic: Record<string, unknown>) => {
        if (topic.timeSpent === undefined) {
          topic.timeSpent = 0;
        }
      });
  });

db.version(6)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
  })
  .upgrade((tx) => {
    return tx
      .table("topics")
      .toCollection()
      .modify((topic: Record<string, unknown>) => {
        if (topic.priority === undefined) {
          topic.priority = 0;
        }
      });
  });

db.version(7).stores({
  items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
  groups: "id, sortOrder",
  topics: "id, sortOrder, status",
  timeLogs: "id, topicId, loggedAt",
  settings: "id",
});

db.version(8)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
    timeLogs: "id, topicId, loggedAt",
    settings: "id",
  })
  .upgrade((tx) => {
    return tx
      .table("topics")
      .toCollection()
      .modify((topic: Record<string, unknown>) => {
        if (topic.estimatedSeconds === undefined) {
          topic.estimatedSeconds = 0;
        }
      });
  });

db.version(9)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
    timeLogs: "id, topicId, loggedAt",
    settings: "id",
  })
  .upgrade((tx) => {
    return tx
      .table("topics")
      .toCollection()
      .modify((topic: Record<string, unknown>) => {
        const old = (topic.priority as number) ?? 0;
        if (old === 0) topic.priority = 1;
        else if (old <= 25) topic.priority = 2;
        else if (old <= 50) topic.priority = 3;
        else if (old <= 75) topic.priority = 4;
        else topic.priority = 5;
      });
  });

db.version(10)
  .stores({
    items: "id, url, category, status, sortOrder, addedAt, groupId, *topicIds",
    groups: "id, sortOrder",
    topics: "id, sortOrder, status",
    timeLogs: "id, topicId, loggedAt",
    settings: "id",
  })
  .upgrade((tx) => {
    return tx
      .table("topics")
      .toCollection()
      .modify((topic: Record<string, unknown>) => {
        if (topic.currentInterval === undefined) {
          topic.currentInterval = 1;
        }
        // lastActivityDate left undefined — will be set on first activity
      });
  });

db.cloud.configure({
  databaseUrl: process.env.NEXT_PUBLIC_DEXIE_CLOUD_URL || "",
  requireAuth: false,
  tryUseServiceWorker: false,
});

export { db };
