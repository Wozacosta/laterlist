import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Topic } from "@/db";

const DATA_DIR = join(process.cwd(), ".data");
const TOPICS_FILE = join(DATA_DIR, "topics.json");

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
