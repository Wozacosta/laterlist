import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/db";
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
    async (enriched: Omit<Item, "id" | "sortOrder" | "addedAt" | "status">) => {
      await db.items.add({
        ...enriched,
        id: `itm${crypto.randomUUID()}`,
        sortOrder: Date.now(),
        addedAt: new Date().toISOString(),
        status: "unread",
      });
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
    await db.items.update(id, {
      status: "done",
      doneAt: new Date().toISOString(),
    });
  }, []);

  const unmarkDone = useCallback(async (id: string) => {
    await db.items.update(id, {
      status: "unread",
      doneAt: undefined,
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
  };
}
