import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Topic, Item } from "@/db";

const DATA_DIR = join(process.cwd(), ".data");
const TOPICS_FILE = join(DATA_DIR, "topics.json");
const ITEMS_FILE = join(DATA_DIR, "items.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readTopics(): Topic[] {
  ensureDir();
  if (!existsSync(TOPICS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TOPICS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function writeTopics(topics: Topic[]) {
  ensureDir();
  writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
}

export function getTopicById(id: string): Topic | undefined {
  return readTopics().find((t) => t.id === id);
}

export function addTopic(topic: Topic): Topic {
  const topics = readTopics();
  topics.push(topic);
  writeTopics(topics);
  return topic;
}

export function updateTopic(id: string, patch: Partial<Topic>): Topic | null {
  const topics = readTopics();
  const idx = topics.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  topics[idx] = { ...topics[idx], ...patch, id }; // id cannot be changed
  writeTopics(topics);
  return topics[idx];
}

export function deleteTopic(id: string): boolean {
  const topics = readTopics();
  const filtered = topics.filter((t) => t.id !== id);
  if (filtered.length === topics.length) return false;
  writeTopics(filtered);
  return true;
}

// ── Items (subtasks) ─────────────────────────────────────────────────────

export function readItems(): Item[] {
  ensureDir();
  if (!existsSync(ITEMS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(ITEMS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function writeItems(items: Item[]) {
  ensureDir();
  writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
}

export function getItemById(id: string): Item | undefined {
  return readItems().find((i) => i.id === id);
}

export function getItemsByTopicId(topicId: string): Item[] {
  return readItems().filter((i) => i.topicIds?.includes(topicId));
}

export function addItem(item: Item): Item {
  const items = readItems();
  items.push(item);
  writeItems(items);
  return item;
}

export function updateItem(id: string, patch: Partial<Item>): Item | null {
  const items = readItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, id };
  writeItems(items);
  return items[idx];
}

export function deleteItem(id: string): boolean {
  const items = readItems();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  writeItems(filtered);
  return true;
}
