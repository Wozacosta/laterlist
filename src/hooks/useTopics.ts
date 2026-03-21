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
      priority: 0,
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
    await db.topics.update(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
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
    const topic = await db.topics.get(id);
    if (!topic) return;
    await db.topics.update(id, {
      timeSpent: topic.timeSpent + seconds,
    });
  }, []);

  const setPriority = useCallback(async (id: string, priority: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(priority)));
    await db.topics.update(id, { priority: clamped });
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
  };
}
