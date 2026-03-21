"use client";

import { useState, useCallback, useMemo } from "react";
import { useObservable } from "dexie-react-hooks";
import { db } from "@/db";
import { useItems } from "@/hooks/useItems";
import { useGroups } from "@/hooks/useGroups";
import { useTopics } from "@/hooks/useTopics";
import { useSettings } from "@/hooks/useSettings";
import { useTodayTime } from "@/hooks/useTodayTime";
import { useStreak } from "@/hooks/useStreak";
import { useStudyQueue } from "@/hooks/useStudyQueue";
import { useWeeklyActivity } from "@/hooks/useWeeklyActivity";
import { AddItemInput } from "@/components/AddItemInput";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { TopicList } from "@/components/TopicList";
import { DailyGoal } from "@/components/DailyGoal";
import { StudyQueue } from "@/components/StudyQueue";
import { LearningDashboard } from "@/components/LearningDashboard";
import { TopicDetail } from "@/components/TopicDetail";
import { LearningReport } from "@/components/LearningReport";
import { CloudSyncButton } from "@/components/CloudSyncButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SkeletonList } from "@/components/SkeletonList";
import { DataManager } from "@/components/DataManager";
import { useToast } from "@/components/Toast";
import type { Category, Item, GroupColor } from "@/db";

type View = "list" | "learn";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

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
    deleteItem,
    reorderItems,
    assignToGroup,
    assignToTopic,
    unassignFromTopic,
  } = useItems();

  const {
    groups,
    addGroup,
    renameGroup,
    setColor,
    toggleCollapse,
    deleteGroup,
  } = useGroups();

  const {
    topics,
    addTopic,
    renameTopic,
    deleteTopic,
    completeTopic,
    reopenTopic,
    logTime,
    setPriority,
    setEstimate,
    markStudied,
  } = useTopics();

  const { dailyGoalMinutes, setDailyGoal } = useSettings();
  const todaySeconds = useTodayTime();
  const streak = useStreak();
  const studyQueue = useStudyQueue(topics);
  const { days, topicTotals, weekTotal } = useWeeklyActivity();

  const { toast } = useToast();
  const currentUser = useObservable(db.cloud.currentUser);
  const isLoggedIn = currentUser?.isLoggedIn ?? false;

  const [view, setView] = useState<View>("list");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hideDone, setHideDone] = useState(false);

  const selectedTopic = useMemo(
    () => selectedTopicId ? topics.find((t) => t.id === selectedTopicId) ?? null : null,
    [selectedTopicId, topics]
  );

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
    async (data: EnrichedData) => {
      // Only check for duplicates on URL items
      if (data.url) {
        const duplicate = items.find(
          (i) => i.url && i.url.replace(/\/$/, "") === data.url.replace(/\/$/, "")
        );
        if (duplicate) {
          toast(`Already saved: "${duplicate.title}"`, "warning");
          return;
        }
      }
      await addItem(data);
      toast("Added to your list");
    },
    [addItem, items, toast]
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
      toast("Topic deleted", "error");
    },
    [deleteTopic, toast]
  );

  const handleLogTime = useCallback(
    async (id: string, seconds: number) => {
      await logTime(id, seconds);
      const h = Math.floor(seconds / 3600);
      const m = Math.round((seconds % 3600) / 60);
      const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
      toast(`Logged ${label}`);
    },
    [logTime, toast]
  );

  const handleMarkStudied = useCallback(
    async (id: string) => {
      await markStudied(id);
      toast("Marked as studied");
    },
    [markStudied, toast]
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">laterlist</h1>
        <div className="flex items-center gap-2">
          <DataManager />
          <ThemeToggle />
          <CloudSyncButton />
        </div>
      </div>

      {/* View toggle */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("learn")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "learn"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Learn
        </button>
      </div>

      {view === "list" ? (
        <>
          <AddItemInput onAdd={handleAdd} isLoggedIn={isLoggedIn} />

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

          {!isLoading && totalUnreadSeconds > 0 && (
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-600">
              {formatTotalTime(totalUnreadSeconds)}
            </p>
          )}

          {isLoading ? (
            <SkeletonList />
          ) : (
            <ItemList
              items={filteredItems}
              groups={groups}
              topics={topics}
              filtered={isFiltered}
              onMarkDone={handleMarkDone}
              onUnmarkDone={unmarkDone}
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
          )}

          {archivedItems.length > 0 && (
            <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
              {archivedItems.length} archived item{archivedItems.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      ) : showReport ? (
        <LearningReport
          topics={topics}
          onBack={() => setShowReport(false)}
        />
      ) : selectedTopic ? (
        <TopicDetail
          topic={selectedTopic}
          items={items}
          onBack={() => setSelectedTopicId(null)}
          onMarkDone={handleMarkDone}
          onUnmarkDone={unmarkDone}
        />
      ) : (
        <>
          <DailyGoal
            dailyGoalMinutes={dailyGoalMinutes}
            todaySeconds={todaySeconds}
            streak={streak}
            onSetGoal={setDailyGoal}
          />
          <LearningDashboard
            days={days}
            topicTotals={topicTotals}
            weekTotal={weekTotal}
            topics={topics}
            streak={streak}
            totalVelocitySecsPerDay={weekTotal / 7}
            onViewReport={() => setShowReport(true)}
          />
          <StudyQueue
            entries={studyQueue}
            onMarkStudied={handleMarkStudied}
            onSelectTopic={setSelectedTopicId}
          />
          <TopicList
            topics={topics}
            items={items}
            onAdd={handleAddTopic}
            onRename={renameTopic}
            onDelete={handleDeleteTopic}
            onComplete={completeTopic}
            onReopen={reopenTopic}
            onLogTime={handleLogTime}
            onSetPriority={setPriority}
            onSetEstimate={setEstimate}
            onSelectTopic={setSelectedTopicId}
          />
        </>
      )}
    </main>
  );
}
