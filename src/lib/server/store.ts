import { kvGet, kvSet } from "./storage";
import type { Topic, Item, TimeLog } from "@/db";

const TOPICS_KEY = "laterlist:topics";
const ITEMS_KEY = "laterlist:items";
const TIMELOGS_KEY = "laterlist:timelogs";

export async function readTopics(): Promise<Topic[]> {
  return (await kvGet<Topic[]>(TOPICS_KEY)) ?? [];
}

export async function writeTopics(topics: Topic[]): Promise<void> {
  await kvSet(TOPICS_KEY, topics);
}

export async function getTopicById(id: string): Promise<Topic | undefined> {
  return (await readTopics()).find((t) => t.id === id);
}

export async function addTopic(topic: Topic): Promise<Topic> {
  const topics = await readTopics();
  topics.push(topic);
  await writeTopics(topics);
  return topic;
}

export async function updateTopic(id: string, patch: Partial<Topic>): Promise<Topic | null> {
  const topics = await readTopics();
  const idx = topics.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  topics[idx] = { ...topics[idx], ...patch, id };
  await writeTopics(topics);
  return topics[idx];
}

export async function deleteTopic(id: string): Promise<boolean> {
  const topics = await readTopics();
  const filtered = topics.filter((t) => t.id !== id);
  if (filtered.length === topics.length) return false;
  await writeTopics(filtered);
  return true;
}

// ── Items (subtasks) ─────────────────────────────────────────────────────

export async function readItems(): Promise<Item[]> {
  return (await kvGet<Item[]>(ITEMS_KEY)) ?? [];
}

export async function writeItems(items: Item[]): Promise<void> {
  await kvSet(ITEMS_KEY, items);
}

export async function getItemById(id: string): Promise<Item | undefined> {
  return (await readItems()).find((i) => i.id === id);
}

export async function getItemsByTopicId(topicId: string): Promise<Item[]> {
  return (await readItems()).filter((i) => i.topicIds?.includes(topicId));
}

export async function addItem(item: Item): Promise<Item> {
  const items = await readItems();
  items.push(item);
  await writeItems(items);
  return item;
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item | null> {
  const items = await readItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, id };
  await writeItems(items);
  return items[idx];
}

export async function deleteItem(id: string): Promise<boolean> {
  const items = await readItems();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeItems(filtered);
  return true;
}

// ── Time Logs ────────────────────────────────────────────────────────────

export async function readTimeLogs(): Promise<TimeLog[]> {
  return (await kvGet<TimeLog[]>(TIMELOGS_KEY)) ?? [];
}

export async function writeTimeLogs(logs: TimeLog[]): Promise<void> {
  await kvSet(TIMELOGS_KEY, logs);
}

export async function getTimeLogsByTopicId(topicId: string): Promise<TimeLog[]> {
  return (await readTimeLogs()).filter((l) => l.topicId === topicId);
}

export async function addTimeLog(log: TimeLog): Promise<TimeLog> {
  const logs = await readTimeLogs();
  logs.push(log);
  await writeTimeLogs(logs);
  return log;
}

/** Log time to a topic: creates a TimeLog and updates the topic's timeSpent + SR clock. */
export async function logTimeToTopic(
  topicId: string,
  seconds: number,
  source: "manual" | "done" = "manual"
): Promise<TimeLog | null> {
  const topic = await getTopicById(topicId);
  if (!topic) return null;

  const now = new Date().toISOString();
  const log: TimeLog = {
    id: `log${crypto.randomUUID()}`,
    topicId,
    seconds,
    loggedAt: now,
    source,
  };

  await addTimeLog(log);

  await updateTopic(topicId, {
    timeSpent: topic.timeSpent + seconds,
    lastActivityDate: now,
    currentInterval: 1,
  });

  return log;
}
