import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item, type Topic } from "@/db";
import { isArchived } from "@/lib/archive";
import { replaceTopic } from "@/lib/topicQueue";

export function useItems() {
  const allItems = useLiveQuery(() =>
    db.items.orderBy("sortOrder").reverse().toArray()
  );

  const items = useMemo(
    () => (allItems ?? []).filter((i) => !i.deletedAt && !isArchived(i)),
    [allItems]
  );

  const archivedItems = useMemo(
    () => (allItems ?? []).filter((i) => !i.deletedAt && isArchived(i)),
    [allItems]
  );

  const trashedItems = useMemo(
    () =>
      (allItems ?? [])
        .filter((i) => i.deletedAt)
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
    [allItems]
  );

  const addItem = useCallback(
    async (
      enriched: Omit<Item, "id" | "sortOrder" | "addedAt" | "status">,
      position: "top" | "bottom" = "top"
    ): Promise<string> => {
      const id = `itm${crypto.randomUUID()}`;
      const bottom = position === "bottom" ? await db.items.orderBy("sortOrder").first() : undefined;
      await db.items.add({
        ...enriched,
        id,
        sortOrder: bottom ? bottom.sortOrder - 1 : Date.now(),
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
      patch: Partial<Pick<Item, "tags" | "notes" | "title" | "thumbnail" | "category" | "duration">>
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

  const publishItem = useCallback(async (id: string) => {
    const item = await db.items.get(id);
    if (!item) return;
    const now = new Date().toISOString();
    await db.items.update(id, { publishedAt: now });

    // Sync to server store for public reading-list API — non-blocking
    fetch("/api/items/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, publishedAt: now }),
    }).catch(() => {});
  }, []);

  const unpublishItem = useCallback(async (id: string) => {
    await db.items.update(id, { publishedAt: undefined });

    // Remove from server store
    fetch("/api/items/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, publishedAt: null, status: "unread" }),
    }).catch(() => {});
  }, []);

  const toggleStar = useCallback(async (id: string) => {
    const item = await db.items.get(id);
    if (!item) return;
    await db.items.update(id, { starred: !item.starred });
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await db.items.update(id, { deletedAt: new Date().toISOString() });
  }, []);

  const restoreItem = useCallback(async (id: string) => {
    await db.items.update(id, { deletedAt: null });
  }, []);

  const deleteForever = useCallback(async (ids: string[]) => {
    await db.items.bulkDelete(ids);
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

  const doNext = useCallback(async (id: string) => {
    const top = await db.items.orderBy("sortOrder").last();
    if (!top || top.id === id) return;
    await db.items.update(id, { sortOrder: top.sortOrder + 1 });
  }, []);

  const moveToTopic = useCallback(async (id: string, from: string, to: string) => {
    const item = await db.items.get(id);
    if (!item) return;
    await db.items.update(id, { topicIds: replaceTopic(item.topicIds ?? [], from, to) });
  }, []);

  return {
    items,
    archivedItems,
    trashedItems,
    isLoading: allItems === undefined,
    doNext,
    moveToTopic,
    addItem,
    updateItem,
    markDone,
    unmarkDone,
    publishItem,
    unpublishItem,
    toggleStar,
    deleteItem,
    restoreItem,
    deleteForever,
    reorderItems,
    assignToGroup,
    assignToTopic,
    unassignFromTopic,
  };
}
