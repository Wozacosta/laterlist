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
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { useTimerState, TimerContext } from "@/hooks/useTimer";
import { AddItemInput } from "@/components/AddItemInput";
import { FilterBar } from "@/components/FilterBar";
import { ItemList } from "@/components/ItemList";
import { TopicList } from "@/components/TopicList";
import { DailyGoal } from "@/components/DailyGoal";
import { CalendarConnect } from "@/components/CalendarConnect";
import { ProtonCalendarConnect } from "@/components/ProtonCalendarConnect";
import { CalendarSuggestions } from "@/components/CalendarSuggestions";
import { SessionGraph } from "@/components/SessionGraph";
import { StudyQueue } from "@/components/StudyQueue";
import { DailyPlan } from "@/components/DailyPlan";
import { LearningDashboard } from "@/components/LearningDashboard";
import { TopicDetail } from "@/components/TopicDetail";
import { LearningReport } from "@/components/LearningReport";
import { PlaylistReview } from "@/components/PlaylistReview";
import { CloudSyncButton } from "@/components/CloudSyncButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SkeletonList } from "@/components/SkeletonList";
import { DataManager } from "@/components/DataManager";
import { useToast } from "@/components/Toast";
import type { Category, Item, GroupColor } from "@/db";
import type { PlaylistVideo } from "@/app/api/playlist/route";

type View = "list" | "learn";

type EnrichedData = Omit<Item, "id" | "sortOrder" | "addedAt" | "status">;

function formatTotalTime(seconds: number): string {
  if (seconds === 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m to go`;
  return `${m}m to go`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
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
    setNotes,
    setDependsOn,
  } = useTopics();

  const { dailyGoalMinutes, setDailyGoal } = useSettings();
  const todaySeconds = useTodayTime();
  const streak = useStreak();
  const studyQueue = useStudyQueue(topics, items);
  const { days, topicTotals, weekTotal } = useWeeklyActivity();
  const dailyPlan = useDailyPlan(studyQueue, topics, items, dailyGoalMinutes, todaySeconds);
  const timerState = useTimerState();

  const { toast } = useToast();
  const currentUser = useObservable(db.cloud.currentUser);
  const isLoggedIn = currentUser?.isLoggedIn ?? false;

  const [view, setView] = useState<View>("list");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hideDone, setHideDone] = useState(false);
  // LT-43: track newly-added item for optional topic assignment
  const [pendingAssignItemId, setPendingAssignItemId] = useState<string | null>(null);
  // LT-38: playlist import data for review step
  const [pendingPlaylist, setPendingPlaylist] = useState<{
    title: string;
    videos: PlaylistVideo[];
  } | null>(null);

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
      const id = await addItem(data);
      toast("Added to your list");
      return id;
    },
    [addItem, items, toast]
  );

  // LT-43: When adding from the dashboard, prompt to optionally assign to a topic
  const handleAddFromDashboard = useCallback(
    async (data: EnrichedData) => {
      const id = await handleAdd(data);
      if (id && topics.length > 0) {
        setPendingAssignItemId(id);
      }
    },
    [handleAdd, topics.length]
  );

  const handleAssignPending = useCallback(
    async (topicId: string) => {
      if (!pendingAssignItemId) return;
      await assignToTopic(pendingAssignItemId, topicId);
      const topic = topics.find((t) => t.id === topicId);
      toast(`Assigned to "${topic?.name ?? "topic"}"`);
      setPendingAssignItemId(null);
    },
    [pendingAssignItemId, assignToTopic, topics, toast]
  );

  // LT-38: playlist import handler
  const handlePlaylistLoaded = useCallback(
    (title: string, videos: PlaylistVideo[]) => {
      setPendingPlaylist({ title, videos });
      toast(`Loaded ${videos.length} videos from "${title}"`);
    },
    [toast]
  );

  // LT-3A: bulk-import selected videos as items assigned to the current topic
  const handlePlaylistConfirm = useCallback(
    async (selectedVideos: PlaylistVideo[]) => {
      if (!selectedTopicId) return;
      for (const video of selectedVideos) {
        await addItem({
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          title: video.title,
          thumbnail: video.thumbnail || undefined,
          category: "video",
          tags: [],
          duration: video.duration ?? undefined,
          topicIds: [selectedTopicId],
        });
      }
      toast(`Imported ${selectedVideos.length} video${selectedVideos.length !== 1 ? "s" : ""}`);
      setPendingPlaylist(null);
    },
    [selectedTopicId, addItem, toast]
  );

  const handleAddToTopic = useCallback(
    async (data: EnrichedData) => {
      if (!selectedTopicId) return;
      // Inject the current topic into topicIds
      const topicIds = [...(data.topicIds ?? []), selectedTopicId];
      await handleAdd({ ...data, topicIds });
    },
    [handleAdd, selectedTopicId]
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

  // LT-3H: Stop timer, log elapsed time, reset SR clock
  // LT-3J: Record session for history/visualization
  const handleStopTimer = useCallback(async () => {
    const stopped = timerState.stop();
    if (!stopped) return;
    const elapsed = Math.floor((Date.now() - stopped.startTime) / 1000);
    if (elapsed > 0) {
      await logTime(stopped.topicId, elapsed);
      const h = Math.floor(elapsed / 3600);
      const m = Math.round((elapsed % 3600) / 60);
      const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
      toast(`Logged ${label} to "${stopped.topicName}"`);

      // Record session for graph visualization (LT-3J)
      const now = new Date().toISOString();
      const startedAt = new Date(stopped.startTime).toISOString();
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: stopped.topicId,
          topicName: stopped.topicName,
          startedAt,
          endedAt: now,
          durationSeconds: elapsed,
          type: timerState.pomodoro.enabled ? "work" : "freeform",
          status: "completed",
          pomodoroConfig: timerState.pomodoro.enabled ? {
            workMinutes: timerState.pomodoro.workMinutes,
            breakMinutes: timerState.pomodoro.breakMinutes,
            cycleNumber: 1,
          } : undefined,
        }),
      }).catch(() => {}); // Non-blocking
    }
  }, [timerState, logTime, toast]);

  const handleMarkStudied = useCallback(
    async (id: string) => {
      await markStudied(id);
      toast("Marked as studied");
    },
    [markStudied, toast]
  );

  return (
    <TimerContext.Provider value={timerState}>
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">laterlist</h1>
        <div className="flex items-center gap-2">
          <DataManager />
          <ThemeToggle />
          <CloudSyncButton />
        </div>
      </div>

      {/* Pomodoro alert overlay (LT-3I) */}
      {timerState.pomodoroAlert && (
        <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950 animate-pulse">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {timerState.pomodoroPhase === "break"
                ? "Work interval done — time for a break!"
                : "Break over — back to work!"}
            </p>
            <button
              type="button"
              onClick={timerState.dismissAlert}
              className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Persistent timer display (LT-3G/3H/3I) */}
      {timerState.active && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-green-600 dark:text-green-400 animate-pulse">●</span>
              <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                {timerState.active.topicName}
              </span>
              {timerState.pomodoro.enabled && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  timerState.pomodoroPhase === "work"
                    ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                    : "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                }`}>
                  {timerState.pomodoroPhase === "work" ? "WORK" : "BREAK"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {timerState.pomodoro.enabled && (
                <span className="font-mono text-xs text-green-600 dark:text-green-400">
                  {formatElapsed(timerState.pomodoroRemaining)}
                </span>
              )}
              <span className="font-mono text-sm font-semibold text-green-700 dark:text-green-300">
                {formatElapsed(timerState.elapsed)}
              </span>
              <button
                type="button"
                onClick={handleStopTimer}
                className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                title="Stop timer and log time"
              >
                ■ Stop
              </button>
            </div>
          </div>
          {/* Pomodoro toggle row */}
          <div className="mt-1.5 flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-300 cursor-pointer">
              <input
                type="checkbox"
                checked={timerState.pomodoro.enabled}
                onChange={(e) => timerState.setPomodoroEnabled(e.target.checked)}
                className="h-3 w-3 rounded border-green-400 text-green-600 focus:ring-green-500"
              />
              Pomodoro
            </label>
            {timerState.pomodoro.enabled && (
              <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={timerState.pomodoro.workMinutes}
                  onChange={(e) => timerState.setPomodoroWork(parseInt(e.target.value, 10) || 25)}
                  className="w-10 rounded border border-green-300 bg-white px-1 py-0.5 text-center text-[11px] text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
                />
                <span>work /</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timerState.pomodoro.breakMinutes}
                  onChange={(e) => timerState.setPomodoroBreak(parseInt(e.target.value, 10) || 5)}
                  className="w-10 rounded border border-green-300 bg-white px-1 py-0.5 text-center text-[11px] text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200"
                />
                <span>break</span>
              </div>
            )}
          </div>
        </div>
      )}

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
        <>
          <TopicDetail
            topic={selectedTopic}
            items={items}
            allTopics={topics}
            onBack={() => setSelectedTopicId(null)}
            onMarkDone={handleMarkDone}
            onUnmarkDone={unmarkDone}
            onSetNotes={setNotes}
            onUpdateItemNotes={handleUpdateNotes}
            onAddItem={handleAddToTopic}
            onPlaylistLoaded={handlePlaylistLoaded}
            onSetDependsOn={setDependsOn}
            onSelectTopic={setSelectedTopicId}
            onStartTimer={timerState.start}
            activeTimerTopicId={timerState.active?.topicId ?? null}
            isLoggedIn={isLoggedIn}
          />
          {pendingPlaylist && (
            <PlaylistReview
              title={pendingPlaylist.title}
              videos={pendingPlaylist.videos}
              onConfirm={handlePlaylistConfirm}
              onCancel={() => setPendingPlaylist(null)}
            />
          )}
        </>
      ) : (
        <>
          <AddItemInput onAdd={handleAddFromDashboard} isLoggedIn={isLoggedIn} />

          {/* LT-43: Topic assignment prompt after adding from dashboard */}
          {pendingAssignItemId && topics.length > 0 && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                Assign to a topic?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topics
                  .filter((t) => t.status !== "completed")
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAssignPending(t.id)}
                      className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-blue-900"
                    >
                      {t.name}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setPendingAssignItemId(null)}
                  className="rounded-full px-3 py-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          <DailyGoal
            dailyGoalMinutes={dailyGoalMinutes}
            todaySeconds={todaySeconds}
            streak={streak}
            onSetGoal={setDailyGoal}
          />
          <CalendarConnect />
          <ProtonCalendarConnect />
          <CalendarSuggestions
            dailyGoalMinutes={dailyGoalMinutes}
            studyQueue={studyQueue.map((e) => ({ topicId: e.topicId, topicName: e.topicName }))}
          />
          <SessionGraph />
          <DailyPlan
            recommendations={dailyPlan}
            onSelectTopic={setSelectedTopicId}
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
            onStartTimer={timerState.start}
            activeTimerTopicId={timerState.active?.topicId ?? null}
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
    </TimerContext.Provider>
  );
}
