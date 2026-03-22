import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item, type Topic } from "@/db";
import { isArchived } from "@/lib/archive";

export function useItems() {
  const allItems = useLiveQuery(() =>
    db.items.orderBy("sortOrder").reverse().toArray()
  );

  const items = useMemo(
    () => (allItems ?? []).filter((i) => !isArchived(i)),
    [allItems]
  );

  const archivedItems = useMemo(
    () => (allItems ?? []).filter(isArchived),
    [allItems]
  );

  const addItem = useCallback(
    async (enriched: Omit<Item, "id" | "sortOrder" | "addedAt" | "status">): Promise<string> => {
      const id = `itm${crypto.randomUUID()}`;
      await db.items.add({
        ...enriched,
        id,
        sortOrder: Date.now(),
        addedAt: new Date().toISOString(),
        status: "unread",
      });
      return id;
    },
    []
  );

  const updateItem = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Item, "tags" | "notes" | "title">>
    ) => {
      await db.items.update(id, patch);
    },
    []
  );

  const markDone = useCallback(async (id: string) => {
    await db.transaction("rw", [db.items, db.topics, db.timeLogs], async () => {
      const item = await db.items.get(id);
      if (!item) return;
      const now = new Date().toISOString();
      await db.items.update(id, {
        status: "done",
        doneAt: now,
      });
      // Auto-log duration to linked topics (LT-10) and reset SR clock (LT-21)
      if (item.topicIds?.length) {
        for (const topicId of item.topicIds) {
          const topic = await db.topics.get(topicId);
          if (topic) {
            const update: Partial<Topic> = {
              lastActivityDate: now,
              currentInterval: 1,
            };
            if (item.duration) {
              update.timeSpent = (topic.timeSpent ?? 0) + item.duration;
            }
            await db.topics.update(topicId, update);
            if (item.duration) {
              await db.timeLogs.add({
                id: `log${crypto.randomUUID()}`,
                topicId,
                seconds: item.duration,
                loggedAt: now,
                source: "done",
              });
            }
          }
        }
      }
    });
  }, []);

  const unmarkDone = useCallback(async (id: string) => {
    await db.transaction("rw", [db.items, db.topics], async () => {
      const item = await db.items.get(id);
      if (!item) return;
      await db.items.update(id, {
        status: "unread",
        doneAt: undefined,
      });
      // Reverse time log from linked topics (LT-10)
      if (item.duration && item.topicIds?.length) {
        for (const topicId of item.topicIds) {
          const topic = await db.topics.get(topicId);
          if (topic) {
            await db.topics.update(topicId, {
              timeSpent: Math.max(0, (topic.timeSpent ?? 0) - item.duration),
            });
          }
        }
      }
    });
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await db.items.delete(id);
  }, []);

  const reorderItems = useCallback(
    async (updates: Array<{ id: string; sortOrder: number }>) => {
      await db.items.bulkUpdate(
        updates.map((u) => ({ key: u.id, changes: { sortOrder: u.sortOrder } }))
      );
    },
    []
  );

  const assignToGroup = useCallback(
    async (id: string, groupId: string | undefined) => {
      await db.items.update(id, { groupId });
    },
    []
  );

  const assignToTopic = useCallback(
    async (id: string, topicId: string) => {
      const item = await db.items.get(id);
      if (!item) return;
      const current = item.topicIds ?? [];
      if (current.includes(topicId)) return;
      await db.items.update(id, { topicIds: [...current, topicId] });
    },
    []
  );

  const unassignFromTopic = useCallback(
    async (id: string, topicId: string) => {
      const item = await db.items.get(id);
      if (!item) return;
      const updated = (item.topicIds ?? []).filter((t) => t !== topicId);
      await db.items.update(id, { topicIds: updated });
    },
    []
  );

  return {
    items,
    archivedItems,
    isLoading: allItems === undefined,
    addItem,
    updateItem,
    markDone,
    unmarkDone,
    deleteItem,
    reorderItems,
    assignToGroup,
    assignToTopic,
    unassignFromTopic,
  };
}
