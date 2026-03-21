import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Topic } from "@/db";

const DAY_MS = 86_400_000;

export type ReportPeriod = "week" | "month";

export interface TopicReport {
  topicId: string;
  topicName: string;
  priority: number;
  seconds: number;
  percent: number; // actual allocation %
  targetPercent: number; // weight-based target from 1-5 priority
  drift: number; // percent - targetPercent (positive = over-served)
}

export interface ReportData {
  period: ReportPeriod;
  totalSeconds: number;
  avgSecondsPerDay: number;
  daysInPeriod: number;
  daysWithActivity: number;
  topicReports: TopicReport[];
  dailyBreakdown: { dateKey: string; label: string; seconds: number }[];
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useReportData(topics: Topic[], period: ReportPeriod): ReportData {
  const daysInPeriod = period === "week" ? 7 : 30;

  const periodStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (daysInPeriod - 1));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [daysInPeriod]);

  const logs = useLiveQuery(
    () => db.timeLogs.where("loggedAt").above(periodStart).toArray(),
    [periodStart]
  );

  return useMemo(() => {
    const now = new Date();

    // Initialize daily breakdown
    const dailyMap = new Map<string, number>();
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      dailyMap.set(toDateKey(d), 0);
    }

    // Aggregate
    const topicSecsMap = new Map<string, number>();
    let totalSeconds = 0;

    if (logs) {
      for (const log of logs) {
        totalSeconds += log.seconds;
        topicSecsMap.set(
          log.topicId,
          (topicSecsMap.get(log.topicId) ?? 0) + log.seconds
        );
        const key = toDateKey(new Date(log.loggedAt));
        if (dailyMap.has(key)) {
          dailyMap.set(key, (dailyMap.get(key) ?? 0) + log.seconds);
        }
      }
    }

    const daysWithActivity = Array.from(dailyMap.values()).filter((s) => s > 0).length;
    const avgSecondsPerDay = daysInPeriod > 0 ? totalSeconds / daysInPeriod : 0;

    // Build topic reports with weight-based targets
    const activeTopics = topics.filter((t) => t.status === "active");
    const totalPriority = activeTopics.reduce((sum, t) => sum + (t.priority ?? 3), 0);
    const topicReports: TopicReport[] = activeTopics
      .map((topic) => {
        const seconds = topicSecsMap.get(topic.id) ?? 0;
        const percent = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
        const targetPercent = totalPriority > 0 ? Math.round(((topic.priority ?? 3) / totalPriority) * 100) : 0;
        const drift = percent - targetPercent;
        return {
          topicId: topic.id,
          topicName: topic.name,
          priority: topic.priority ?? 3,
          targetPercent,
          seconds,
          percent,
          drift,
        };
      })
      .filter((r) => r.seconds > 0 || r.priority > 0)
      .sort((a, b) => b.seconds - a.seconds);

    // Build daily breakdown array
    const dailyBreakdown: { dateKey: string; label: string; seconds: number }[] = [];
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = toDateKey(d);
      dailyBreakdown.push({
        dateKey: key,
        label: shortLabel(d),
        seconds: dailyMap.get(key) ?? 0,
      });
    }

    return {
      period,
      totalSeconds,
      avgSecondsPerDay,
      daysInPeriod,
      daysWithActivity,
      topicReports,
      dailyBreakdown,
    };
  }, [topics, logs, period, daysInPeriod]);
}
