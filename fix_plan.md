# laterlist — Fix Plan

## Status Key
- [x] Done
- [ ] Todo
- [~] In progress

## Completed (LT-01, LT-02)
- [x] **LT-01**: Create learning topics with name — `3aeb0bc`
- [x] **LT-02**: Assign items to one or more topics — `6dfc724`

## Phase 1: Time Tracking Foundation

### LT-10: Auto-log time when marking done ✓
- [x] Add `timeSpent: number` (seconds, default 0) to Topic interface
- [x] DB version 5 migration: set `timeSpent = 0` on existing topics
- [x] `markDone`: add item.duration to each linked topic's timeSpent
- [x] `unmarkDone`: subtract item.duration from each linked topic's timeSpent
- [x] Show time spent per topic in TopicList UI (with item count + remaining time)
- [x] Test: verify time accumulates on markDone and reverses on unmarkDone

### LT-13: Mark topic as complete (UI) ✓
- [x] Backend already exists (`completeTopic`/`reopenTopic` in useTopics)
- [x] Add complete/reopen toggle button to TopicRow
- [x] Visual distinction for completed topics (faded, strikethrough, opacity)
- [x] Filter completed topics to bottom of list

### LT-12: Remaining time per topic ✓
- [x] Compute: sum of unread items' durations per topic
- [x] Show remaining time + progress bar in TopicList
- [x] Show total across all topics

## Phase 2: Data Model Extensions

### LT-03: Non-URL learning items ✓
- [x] Allow items without URL (manual title + estimated duration)
- [x] UI: toggle between URL input and manual entry in AddItemInput
- [x] Skip enrichment for non-URL items

### LT-04: Estimated duration on non-URL items ✓
- [x] Duration input (hours/minutes) for manual items
- [x] Validate and convert to seconds

### LT-05: Dexie Cloud sync
- [ ] Already working — all tables sync via dexie-cloud-addon
- [x] Verified: topics table included in cloud config

## Phase 3: Smart Features

### LT-11: Manual time logging ✓
- [x] `logTime(id, seconds)` function in useTopics hook
- [x] Clock icon button in TopicRow to toggle inline log time form
- [x] Inline form with hours/minutes inputs and Log/Cancel buttons
- [x] Toast feedback on successful time logging
- [x] Hidden for completed topics

### LT-20: Weighted priority percentages ✓
- [x] Add `priority: number` (0-100) to Topic interface
- [x] DB v6 migration: set `priority = 0` on existing topics
- [x] `setPriority(id, value)` in useTopics with clamping to 0-100
- [x] Clickable percentage badge on each active TopicRow (click to edit inline)
- [x] Purple highlight when priority > 0, gray when 0%
- [x] Total allocation display in summary row (green=100%, red=>100%, purple=<100%)

### LT-21: Daily learning goal ✓
- [x] Add `TimeLog` interface (id, topicId, seconds, loggedAt, source) and `timeLogs` table
- [x] Add `Settings` interface (id, dailyGoalMinutes) and `settings` table
- [x] DB v7 migration with both new tables
- [x] `useSettings` hook: get/set daily goal (0-1440 minutes)
- [x] `useTodayTime` hook: sum today's time logs
- [x] Modified `logTime` and `markDone` to create TimeLog entries (source: manual/done)
- [x] `DailyGoal` component: clickable goal badge, progress bar, today's total, goal-met state
- [x] Renders in Learn view above TopicList

### LT-22: Streak tracking ✓
- [x] `useStreak` hook: queries timeLogs, groups by calendar day, walks backwards to compute streak
- [x] Streak rules: counts consecutive days with ≥1 log; today or yesterday as anchor
- [x] Flame badge in DailyGoal: "Xd" counter, orange highlight at ≥7 days
- [x] Wired through page.tsx to DailyGoal component

### Remaining
- [ ] LT-23: Smart recommendations
- [ ] LT-24: Velocity & projections

## Phase 4: UX (future)
- [ ] LT-30: Learning dashboard
- [ ] LT-31: Topic detail view
- [ ] LT-32: Weekly/monthly report
- [ ] LT-33: Export learning data
