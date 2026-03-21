import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

export function useTopics() {
  const topics = useLiveQuery(() => db.topics.orderBy("sortOrder").toArray());

  const addTopic = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.topics.add({
      id: `top${crypto.randomUUID()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      sortOrder: Date.now(),
      status: "active",
      timeSpent: 0,
      priority: 3,
      currentInterval: 1,
    });
  }, []);

  const renameTopic = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.topics.update(id, { name: trimmed });
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    await db.transaction("rw", [db.topics, db.items], async () => {
      // Remove this topic from all items' topicIds arrays
      await db.items
        .where("topicIds")
        .equals(id)
        .modify((item: { topicIds?: string[] }) => {
          item.topicIds = (item.topicIds ?? []).filter((t) => t !== id);
        });
      await db.topics.delete(id);
    });
  }, []);

  const completeTopic = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await db.topics.update(id, {
      status: "completed",
      completedAt: now,
      lastActivityDate: now,
      currentInterval: 1,
    });
  }, []);

  const reopenTopic = useCallback(async (id: string) => {
    await db.topics.update(id, {
      status: "active",
      completedAt: undefined,
    });
  }, []);

  const logTime = useCallback(async (id: string, seconds: number) => {
    if (seconds <= 0) return;
    await db.transaction("rw", [db.topics, db.timeLogs], async () => {
      const topic = await db.topics.get(id);
      if (!topic) return;
      await db.topics.update(id, {
        timeSpent: topic.timeSpent + seconds,
        lastActivityDate: new Date().toISOString(),
        currentInterval: 1,
      });
      await db.timeLogs.add({
        id: `log${crypto.randomUUID()}`,
        topicId: id,
        seconds,
        loggedAt: new Date().toISOString(),
        source: "manual",
      });
    });
  }, []);

  const setPriority = useCallback(async (id: string, priority: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(priority)));
    await db.topics.update(id, { priority: clamped });
  }, []);

  const setEstimate = useCallback(async (id: string, seconds: number) => {
    await db.topics.update(id, { estimatedSeconds: Math.max(0, Math.round(seconds)) });
  }, []);

  /** Reset SR clock without logging time — for offline/untracked study (LT-24). */
  const markStudied = useCallback(async (id: string) => {
    await db.topics.update(id, {
      lastActivityDate: new Date().toISOString(),
      currentInterval: 1,
    });
  }, []);

  const setNotes = useCallback(async (id: string, notes: string) => {
    await db.topics.update(id, { notes: notes || undefined });
  }, []);

  return {
    topics: topics ?? [],
    isLoading: topics === undefined,
    addTopic,
    renameTopic,
    deleteTopic,
    completeTopic,
    reopenTopic,
    logTime,
    setPriority,
    setEstimate,
    markStudied,
    setNotes,
  };
}
