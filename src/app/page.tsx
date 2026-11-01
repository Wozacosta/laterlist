"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useObservable } from "dexie-react-hooks";
import { db } from "@/db";
import { useItems } from "@/hooks/useItems";
import { useGroups } from "@/hooks/useGroups";
import { useTopics } from "@/hooks/useTopics";
import { AddItemInput } from "@/components/AddItemInput";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { Sidebar } from "@/components/Sidebar";
import { TopicView } from "@/components/TopicView";
import { SkeletonList } from "@/components/SkeletonList";
import { useToast } from "@/components/Toast";
import type { Category, Item, GroupColor } from "@/db";

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
    isLoading,
    addItem,
    updateItem,
    markDone,
    unmarkDone,
    publishItem,
    unpublishItem,
    deleteItem,
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

  const { topics, addTopic, renameTopic, deleteTopic, completeTopic, reopenTopic } = useTopics();

  const { toast } = useToast();
  const currentUser = useObservable(db.cloud.currentUser);
  const isLoggedIn = currentUser?.isLoggedIn ?? false;

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => {
    setSelectedTopicId(localStorage.getItem(SELECTED_TOPIC_KEY));
  }, []);

  const handleSelectTopic = useCallback((topicId: string | null) => {
    setSelectedTopicId(topicId);
    if (topicId) localStorage.setItem(SELECTED_TOPIC_KEY, topicId);
    else localStorage.removeItem(SELECTED_TOPIC_KEY);
  }, []);

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) ?? null,
    [selectedTopicId, topics]
  );

  // Finished items leave the main list after a while, but they still count as learned.
  const allItems = useMemo(() => [...items, ...archivedItems], [items, archivedItems]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [items]);

  const categories = useMemo(() => {
    const catSet = new Set<Category>();
    items.forEach((item) => catSet.add(item.category));
    return Array.from(catSet) as Category[];
  }, [items]);

  const isFiltered = selectedCategory !== null || selectedTags.length > 0 || hideDone;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (hideDone && item.status === "done") return false;
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => item.tags.includes(t)))
        return false;
      return true;
    });
  }, [items, selectedCategory, selectedTags, hideDone]);

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
      toast("Removed", "error");
    },
    [deleteItem, toast]
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

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

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
        selected={selectedTopic?.id ?? null}
        onSelect={handleSelectTopic}
        onAddTopic={handleAddTopic}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        <AddItemInput
          placeholder={selectedTopic ? `Add to ${selectedTopic.name}: paste a link or type` : "Paste a link or type"}
          onAdd={handleAdd}
          onEnriched={handleEnriched}
          isLoggedIn={isLoggedIn}
        />

        {isLoading ? (
          <SkeletonList />
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
            onRename={renameTopic}
            onComplete={completeTopic}
            onReopen={reopenTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        ) : (
          <>
            <FilterBar
              categories={categories}
              allTags={allTags}
              selectedCategory={selectedCategory}
              selectedTags={selectedTags}
              hideDone={hideDone}
              onCategoryChange={setSelectedCategory}
              onTagToggle={handleTagToggle}
              onToggleHideDone={() => setHideDone((v) => !v)}
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
              filtered={isFiltered}
              onMarkDone={handleMarkDone}
              onUnmarkDone={unmarkDone}
              onPublish={publishItem}
              onUnpublish={unpublishItem}
              onUpdateTags={handleUpdateTags}
              onUpdateNotes={handleUpdateNotes}
              onDelete={handleDelete}
              onReorder={reorderItems}
              onAssignToGroup={assignToGroup}
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
