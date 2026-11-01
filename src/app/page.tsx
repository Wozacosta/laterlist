"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useObservable } from "dexie-react-hooks";
import { db } from "@/db";
import { useItems } from "@/hooks/useItems";
import { useGroups } from "@/hooks/useGroups";
import { useTopics } from "@/hooks/useTopics";
import { AddItemInput } from "@/components/AddItemInput";
import { CloudSyncButton } from "@/components/CloudSyncButton";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { Sidebar, TRASH } from "@/components/Sidebar";
import { TopicView } from "@/components/TopicView";
import { SkeletonList } from "@/components/SkeletonList";
import { TrashView } from "@/components/TrashView";
import { useToast } from "@/components/Toast";
import { itemKind, type ItemKind } from "@/lib/itemKind";
import { matchesSearch } from "@/lib/matchesSearch";
import type { Item, GroupColor } from "@/db";

type NewItem = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

const SELECTED_TOPIC_KEY = "laterlist:selected-topic";

function formatTotalTime(seconds: number): string {
  if (seconds === 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m to go`;
  return `${m}m to go`;
}

const DEFAULT_COLORS: GroupColor[] = ["blue", "purple", "green", "orange", "pink", "gray"];
let colorIndex = 0;

export default function Page() {
  const {
    items,
    archivedItems,
    trashedItems,
    isLoading,
    addItem,
    updateItem,
    markDone,
    unmarkDone,
    publishItem,
    unpublishItem,
    snooze,
    toggleStar,
    deleteItem,
    restoreItem,
    deleteForever,
    reorderItems,
    assignToGroup,
    assignToTopic,
    unassignFromTopic,
    doNext,
    moveToTopic,
  } = useItems();

  const {
    groups,
    addGroup,
    renameGroup,
    setColor,
    toggleCollapse,
    deleteGroup,
  } = useGroups();

  const { topics, addTopic, renameTopic, deleteTopic, completeTopic, reopenTopic, setTopicOrder } =
    useTopics();

  const { toast } = useToast();
  const currentUser = useObservable(db.cloud.currentUser);
  const isLoggedIn = currentUser?.isLoggedIn ?? false;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<ItemKind | null>(null);
  const [starred, setStarred] = useState(false);
  const [noTopic, setNoTopic] = useState(false);
  const [search, setSearch] = useState("");
  const [hideDone, setHideDone] = useState(true);

  useEffect(() => {
    setSelectedTopicId(localStorage.getItem(SELECTED_TOPIC_KEY));
  }, []);

  const handleSelectTopic = useCallback((topicId: string | null) => {
    setSelectedTopicId(topicId);
    if (topicId) localStorage.setItem(SELECTED_TOPIC_KEY, topicId);
    else localStorage.removeItem(SELECTED_TOPIC_KEY);
  }, []);

  const inTrash = selectedTopicId === TRASH;

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) ?? null,
    [selectedTopicId, topics]
  );

  // Finished items leave the main list after a while, but they still count as learned.
  const allItems = useMemo(() => [...items, ...archivedItems], [items, archivedItems]);

  const kinds = useMemo(() => {
    const counts = new Map<ItemKind, number>();
    for (const item of items) {
      const kind = itemKind(item);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  }, [items]);

  const starredCount = useMemo(() => allItems.filter((item) => item.starred).length, [allItems]);

  const noTopicCount = useMemo(
    () => items.filter((item) => !item.topicIds?.length && (!hideDone || item.status === "unread")).length,
    [items, hideDone]
  );

  const isFiltered = selectedKind !== null || starred || noTopic || hideDone || search.trim() !== "";

  // Search and Starred look through everything, so finished and archived items can still be found.
  const filteredItems = useMemo(() => {
    const everything = starred || search.trim() !== "";

    return (everything ? allItems : items).filter((item) => {
      if (hideDone && !everything && item.status === "done") return false;
      if (starred && !item.starred) return false;
      if (selectedKind && itemKind(item) !== selectedKind) return false;
      if (noTopic && item.topicIds?.length) return false;
      return matchesSearch(item, search);
    });
  }, [items, allItems, selectedKind, starred, noTopic, hideDone, search]);

  const totalUnreadSeconds = useMemo(() => {
    return filteredItems
      .filter((i) => i.status === "unread" && i.duration != null)
      .reduce((sum, i) => sum + (i.duration ?? 0), 0);
  }, [filteredItems]);

  const handleAdd = useCallback(
    async (data: NewItem) => {
      if (data.url) {
        const duplicate = allItems.find(
          (i) => i.url && i.url.replace(/\/$/, "") === data.url.replace(/\/$/, "")
        );
        if (duplicate) {
          toast(`Already saved: "${duplicate.title}"`, "warning");
          return;
        }
      }

      // Inside a topic a paste joins the back of the queue, so it never replaces Next.
      if (selectedTopic) {
        const id = await addItem({ ...data, topicIds: [selectedTopic.id] }, "bottom");
        toast(`Added to ${selectedTopic.name}`);
        return id;
      }

      const id = await addItem(data);
      toast("Added to your list");
      return id;
    },
    [addItem, allItems, selectedTopic, toast]
  );

  const handleEnriched = useCallback(
    (id: string, patch: Parameters<typeof updateItem>[1]) => updateItem(id, patch),
    [updateItem]
  );

  const handleMarkDone = useCallback(
    async (id: string) => {
      await markDone(id);
      toast("Marked as done");
    },
    [markDone, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem(id);
      toast("Moved to Trash");
    },
    [deleteItem, toast]
  );

  const handleSnooze = useCallback(
    async (id: string, until: string | null, message: string) => {
      await snooze(id, until);
      toast(message);
    },
    [snooze, toast]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreItem(id);
      toast("Restored");
    },
    [restoreItem, toast]
  );

  const handleDeleteForever = useCallback(
    async (ids: string[]) => {
      await deleteForever(ids);
      toast("Deleted forever", "error");
    },
    [deleteForever, toast]
  );

  const handleUpdateTags = useCallback(
    async (id: string, tags: string[]) => {
      await updateItem(id, { tags });
    },
    [updateItem]
  );

  const handleUpdateNotes = useCallback(
    async (id: string, notes: string) => {
      await updateItem(id, { notes });
    },
    [updateItem]
  );

  const handleMove = useCallback(
    async (id: string, topicId: string) => {
      if (!selectedTopic) return;
      await moveToTopic(id, selectedTopic.id, topicId);
      toast(`Moved to ${topics.find((t) => t.id === topicId)?.name ?? "topic"}`);
    },
    [moveToTopic, selectedTopic, toast, topics]
  );

  // Inside a topic a drop moves the item, like Move to. From All items it adds the topic.
  const handleDropOnTopic = useCallback(
    async (itemId: string, topicId: string) => {
      if (topicId === selectedTopic?.id) return;
      const name = topics.find((t) => t.id === topicId)?.name ?? "topic";

      if (selectedTopic) {
        await moveToTopic(itemId, selectedTopic.id, topicId);
        toast(`Moved to ${name}`);
      } else {
        await assignToTopic(itemId, topicId);
        toast(`Added to ${name}`);
      }
    },
    [assignToTopic, moveToTopic, selectedTopic, toast, topics]
  );

  const handleAddGroup = useCallback(async () => {
    const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
    colorIndex++;
    await addGroup("New group", color);
  }, [addGroup]);

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      await deleteGroup(id);
      toast("Group deleted");
    },
    [deleteGroup, toast]
  );

  const handleAddTopic = useCallback(
    async (name: string) => {
      await addTopic(name);
      toast("Topic created");
    },
    [addTopic, toast]
  );

  const handleDeleteTopic = useCallback(
    async (id: string) => {
      await deleteTopic(id);
      handleSelectTopic(null);
      toast("Topic deleted", "error");
    },
    [deleteTopic, handleSelectTopic, toast]
  );

  return (
    <div className="md:flex">
      <Sidebar
        topics={topics}
        items={items}
        trashCount={trashedItems.length}
        selected={inTrash ? TRASH : selectedTopic?.id ?? null}
        isLoggedIn={isLoggedIn}
        onSelect={handleSelectTopic}
        onAddTopic={handleAddTopic}
        onReorderTopics={setTopicOrder}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        {!isLoading && !isLoggedIn && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to load your list and back it up.
            </p>
            <CloudSyncButton />
          </div>
        )}

        {!inTrash && (
          <AddItemInput
            placeholder={selectedTopic ? `Add to ${selectedTopic.name}: paste a link or type` : "Paste a link or type"}
            onAdd={handleAdd}
            onEnriched={handleEnriched}
            isLoggedIn={isLoggedIn}
          />
        )}

        {isLoading ? (
          <SkeletonList />
        ) : inTrash ? (
          <TrashView items={trashedItems} onRestore={handleRestore} onDeleteForever={handleDeleteForever} />
        ) : selectedTopic ? (
          <TopicView
            topic={selectedTopic}
            topics={topics}
            items={allItems}
            onMarkDone={handleMarkDone}
            onUnmarkDone={unmarkDone}
            onDoNext={doNext}
            onMove={handleMove}
            onDelete={handleDelete}
            onUpdateNotes={handleUpdateNotes}
            onToggleStar={toggleStar}
            onSnooze={handleSnooze}
            onDropOnTopic={handleDropOnTopic}
            onRename={renameTopic}
            onComplete={completeTopic}
            onReopen={reopenTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        ) : (
          <>
            <FilterBar
              kinds={kinds}
              selectedKind={selectedKind}
              starred={starred}
              starredCount={starredCount}
              noTopic={noTopic}
              noTopicCount={noTopicCount}
              hideDone={hideDone}
              search={search}
              onKindChange={setSelectedKind}
              onToggleStarred={() => setStarred((v) => !v)}
              onToggleNoTopic={() => setNoTopic((v) => !v)}
              onToggleHideDone={() => setHideDone((v) => !v)}
              onSearchChange={setSearch}
            />

            {totalUnreadSeconds > 0 && (
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-600">
                {formatTotalTime(totalUnreadSeconds)}
              </p>
            )}

            <ItemList
              items={filteredItems}
              groups={groups}
              topics={topics}
              filtered={isFiltered && items.length > 0}
              onMarkDone={handleMarkDone}
              onUnmarkDone={unmarkDone}
              onPublish={publishItem}
              onUnpublish={unpublishItem}
              onUpdateTags={handleUpdateTags}
              onUpdateNotes={handleUpdateNotes}
              onToggleStar={toggleStar}
              onDelete={handleDelete}
              onReorder={reorderItems}
              onAssignToGroup={assignToGroup}
              onDropOnTopic={handleDropOnTopic}
              onAssignTopic={assignToTopic}
              onUnassignTopic={unassignFromTopic}
              onRenameGroup={renameGroup}
              onSetGroupColor={setColor}
              onToggleGroupCollapse={toggleCollapse}
              onDeleteGroup={handleDeleteGroup}
              onAddGroup={handleAddGroup}
            />

            {archivedItems.length > 0 && (
              <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
                {archivedItems.length} archived item{archivedItems.length !== 1 ? "s" : ""}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
