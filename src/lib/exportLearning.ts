import { db } from "@/db";

export interface LearningExport {
  version: number;
  exportedAt: string;
  topics: Array<{
    name: string;
    status: string;
    priority: number;
    timeSpentSeconds: number;
    timeSpentFormatted: string;
    createdAt: string;
    completedAt?: string;
  }>;
  timeLogs: Array<{
    topicName: string;
    seconds: number;
    formatted: string;
    loggedAt: string;
    source: string;
  }>;
  items: Array<{
    title: string;
    url: string;
    status: string;
    category: string;
    durationSeconds?: number;
    durationFormatted?: string;
    topics: string[];
    addedAt: string;
    doneAt?: string;
  }>;
  summary: {
    totalTopics: number;
    activeTopics: number;
    completedTopics: number;
    totalTimeSpentSeconds: number;
    totalTimeSpentFormatted: string;
    totalItems: number;
    completedItems: number;
    totalTimeLogs: number;
  };
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportLearningJSON(): Promise<number> {
  const [topics, timeLogs, items] = await Promise.all([
    db.topics.toArray(),
    db.timeLogs.toArray(),
    db.items.toArray(),
  ]);

  const topicNameMap = new Map(topics.map((t) => [t.id, t.name]));

  const data: LearningExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    topics: topics.map((t) => ({
      name: t.name,
      status: t.status,
      priority: t.priority,
      timeSpentSeconds: t.timeSpent,
      timeSpentFormatted: formatTime(t.timeSpent),
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
    timeLogs: timeLogs
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .map((log) => ({
        topicName: topicNameMap.get(log.topicId) ?? "Unknown",
        seconds: log.seconds,
        formatted: formatTime(log.seconds),
        loggedAt: log.loggedAt,
        source: log.source,
      })),
    items: items.map((item) => ({
      title: item.title,
      url: item.url,
      status: item.status,
      category: item.category,
      durationSeconds: item.duration,
      durationFormatted: item.duration ? formatTime(item.duration) : undefined,
      topics: (item.topicIds ?? []).map((id) => topicNameMap.get(id) ?? "Unknown"),
      addedAt: item.addedAt,
      doneAt: item.doneAt,
    })),
    summary: {
      totalTopics: topics.length,
      activeTopics: topics.filter((t) => t.status === "active").length,
      completedTopics: topics.filter((t) => t.status === "completed").length,
      totalTimeSpentSeconds: topics.reduce((sum, t) => sum + t.timeSpent, 0),
      totalTimeSpentFormatted: formatTime(topics.reduce((sum, t) => sum + t.timeSpent, 0)),
      totalItems: items.length,
      completedItems: items.filter((i) => i.status === "done").length,
      totalTimeLogs: timeLogs.length,
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  downloadFile(
    JSON.stringify(data, null, 2),
    `laterlist-learning-${date}.json`,
    "application/json"
  );

  return topics.length + timeLogs.length + items.length;
}

export async function exportLearningCSV(): Promise<number> {
  const [topics, timeLogs] = await Promise.all([
    db.topics.toArray(),
    db.timeLogs.toArray(),
  ]);

  const topicNameMap = new Map(topics.map((t) => [t.id, t.name]));

  // Time logs CSV
  const rows = [
    ["Date", "Topic", "Duration", "Seconds", "Source"].join(","),
    ...timeLogs
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .map((log) => {
        const date = new Date(log.loggedAt).toLocaleDateString();
        const topic = (topicNameMap.get(log.topicId) ?? "Unknown").replace(/,/g, ";");
        return [date, `"${topic}"`, formatTime(log.seconds), log.seconds, log.source].join(",");
      }),
  ];

  const date = new Date().toISOString().slice(0, 10);
  downloadFile(
    rows.join("\n"),
    `laterlist-timelogs-${date}.csv`,
    "text/csv"
  );

  return timeLogs.length;
}
