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
import { NextView } from "@/components/NextView";
import { QuickNote } from "@/components/QuickNote";
import { NEXT, Sidebar, TRASH } from "@/components/Sidebar";
import { TopicView } from "@/components/TopicView";
import { SkeletonList } from "@/components/SkeletonList";
import { TrashView } from "@/components/TrashView";
import { useToast } from "@/components/Toast";
import { itemKind, type ItemKind } from "@/lib/itemKind";
import { linkKey } from "@/lib/linkKey";
import { matchesSearch } from "@/lib/matchesSearch";
import type { Item, GroupColor } from "@/db";

type NewItem = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

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

  const { topics, addTopic, renameTopic, setTopicIcon, deleteTopic, completeTopic, reopenTopic, setTopicOrder } =
    useTopics();

  const { toast } = useToast();
  const currentUser = useObservable(db.cloud.currentUser);
  const isLoggedIn = currentUser?.isLoggedIn ?? false;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(NEXT);
  const [followUp, setFollowUp] = useState<{ id: string; title: string; field: "notes" | "progress" } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedKind, setSelectedKind] = useState<ItemKind | null>(null);
  const [starred, setStarred] = useState(false);
  const [noTopic, setNoTopic] = useState(false);
  const [search, setSearch] = useState("");
  const [hideDone, setHideDone] = useState(true);

  // A pinned tab needs this to notice that a snoozed item is due back.
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const inTrash = selectedTopicId === TRASH;
  const inNext = selectedTopicId === NEXT;

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
        const key = linkKey(data.url);
        const duplicate = allItems.find((i) => i.url && linkKey(i.url) === key);
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
      const item = allItems.find((i) => i.id === id);
      await markDone(id);
      toast("Marked as done");
      if (item && !item.notes) setFollowUp({ id, title: item.title, field: "notes" });
    },
    [allItems, markDone, toast]
  );

  const handleFollowUp = useCallback(
    async (text: string) => {
      if (!followUp) return;
      await updateItem(followUp.id, { [followUp.field]: text });
      setFollowUp(null);
      toast("Saved");
    },
    [followUp, toast, updateItem]
  );

  const handleRecall = useCallback(
    async (id: string, text: string) => {
      const item = allItems.find((i) => i.id === id);
      const recalledAt = new Date().toISOString();
      const notes = [item?.notes, text.trim()].filter(Boolean).join("\n");
      await updateItem(id, text.trim() ? { recalledAt, notes } : { recalledAt });
    },
    [allItems, updateItem]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteItem(id);
        toast("Moved to Trash");
      } catch {
        toast("Couldn't take it off your reading list, so it wasn't deleted", "error");
      }
    },
    [deleteItem, toast]
  );

  const handlePublish = useCallback(
    async (id: string) => {
      try {
        await publishItem(id);
        toast("Published");
      } catch {
        toast("Couldn't publish it", "error");
      }
    },
    [publishItem, toast]
  );

  const handleUnpublish = useCallback(
    async (id: string) => {
      try {
        await unpublishItem(id);
        toast("Removed from your reading list");
      } catch {
        toast("Couldn't remove it from your reading list", "error");
      }
    },
    [unpublishItem, toast]
  );

  const handleSnooze = useCallback(
    async (id: string, until: string | null, message: string) => {
      const item = allItems.find((i) => i.id === id);
      await snooze(id, until);
      toast(message);
      if (until && item) setFollowUp({ id, title: item.title, field: "progress" });
    },
    [allItems, snooze, toast]
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
      setSelectedTopicId(null);
      toast("Topic deleted", "error");
    },
    [deleteTopic, toast]
  );

  return (
    <div className="md:flex">
      <Sidebar
        topics={topics}
        items={allItems}
        now={now}
        trashCount={trashedItems.length}
        selected={inTrash ? TRASH : inNext ? NEXT : selectedTopic?.id ?? null}
        isLoggedIn={isLoggedIn}
        onSelect={setSelectedTopicId}
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

        {followUp && (
          <QuickNote
            key={`${followUp.id}-${followUp.field}`}
            label={followUp.title}
            placeholder={followUp.field === "notes" ? "What did you take from it?" : "Where did you get to? e.g. video 7"}
            onSave={handleFollowUp}
            onDismiss={() => setFollowUp(null)}
          />
        )}

        {isLoading ? (
          <SkeletonList />
        ) : inNext ? (
          <NextView
            topics={topics}
            items={allItems}
            now={now}
            noTopicCount={noTopicCount}
            onOpenTopic={setSelectedTopicId}
            onOpenNoTopic={() => {
              setNoTopic(true);
              setSelectedTopicId(null);
            }}
            onRecall={handleRecall}
            onDropOnTopic={handleDropOnTopic}
            onMarkDone={handleMarkDone}
            onUnmarkDone={unmarkDone}
            onDoNext={doNext}
            onDelete={handleDelete}
            onUpdateNotes={handleUpdateNotes}
            onToggleStar={toggleStar}
            onSnooze={handleSnooze}
          />
        ) : inTrash ? (
          <TrashView items={trashedItems} onRestore={handleRestore} onDeleteForever={handleDeleteForever} />
        ) : selectedTopic ? (
          <TopicView
            topic={selectedTopic}
            topics={topics}
            items={allItems}
            now={now}
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
            onSetIcon={setTopicIcon}
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
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
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
