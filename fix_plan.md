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

### LT-03: Non-URL learning items
- [ ] Allow items without URL (manual title + estimated duration)
- [ ] UI: toggle between URL input and manual entry in AddItemInput
- [ ] Skip enrichment for non-URL items

### LT-04: Estimated duration on non-URL items
- [ ] Duration input (hours/minutes) for manual items
- [ ] Validate and convert to seconds

### LT-05: Dexie Cloud sync
- [ ] Already working — all tables sync via dexie-cloud-addon
- [x] Verified: topics table included in cloud config

## Phase 3: Smart Features (future)
- [ ] LT-11: Manual time logging
- [ ] LT-20: Weighted priority percentages
- [ ] LT-21: Daily learning goal
- [ ] LT-22: Streak tracking
- [ ] LT-23: Smart recommendations
- [ ] LT-24: Velocity & projections

## Phase 4: UX (future)
- [ ] LT-30: Learning dashboard
- [ ] LT-31: Topic detail view
- [ ] LT-32: Weekly/monthly report
- [ ] LT-33: Export learning data
