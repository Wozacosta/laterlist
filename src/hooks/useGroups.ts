import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GroupColor } from "@/db";

export function useGroups() {
  const groups = useLiveQuery(() => db.groups.orderBy("sortOrder").toArray());

  const addGroup = useCallback(async (name: string, color: GroupColor) => {
    const all = await db.groups.orderBy("sortOrder").last();
    await db.groups.add({
      id: `grp${crypto.randomUUID()}`,
      name: name.trim() || "New group",
      color,
      sortOrder: (all?.sortOrder ?? 0) + 1000,
      collapsed: false,
    });
  }, []);

  const renameGroup = useCallback(async (id: string, name: string) => {
    await db.groups.update(id, { name: name.trim() || "New group" });
  }, []);

  const setColor = useCallback(async (id: string, color: GroupColor) => {
    await db.groups.update(id, { color });
  }, []);

  const toggleCollapse = useCallback(async (id: string, collapsed: boolean) => {
    await db.groups.update(id, { collapsed });
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await db.transaction("rw", [db.groups, db.items], async () => {
      // Ungroup all items in this group
      await db.items.where("groupId").equals(id).modify({ groupId: undefined });
      await db.groups.delete(id);
    });
  }, []);

  const assignItem = useCallback(async (itemId: string, groupId: string | undefined) => {
    await db.items.update(itemId, { groupId });
  }, []);

  return {
    groups: groups ?? [],
    isLoading: groups === undefined,
    addGroup,
    renameGroup,
    setColor,
    toggleCollapse,
    deleteGroup,
    assignItem,
  };
}
