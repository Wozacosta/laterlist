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
    });
  }, []);

  const renameTopic = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await db.topics.update(id, { name: trimmed });
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    await db.transaction("rw", [db.topics, db.items], async () => {
      // Unlink all items from this topic
      await db.items.where("topicId").equals(id).modify({ topicId: undefined });
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

  return {
    topics: topics ?? [],
    isLoading: topics === undefined,
    addTopic,
    renameTopic,
    deleteTopic,
    completeTopic,
    reopenTopic,
  };
}
