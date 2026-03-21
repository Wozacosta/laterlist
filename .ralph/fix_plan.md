# Ralph Fix Plan

> Synced with PRD: 2026-03-22. Requirement IDs match docs/PRD.md.

## High Priority — Core Learning Loop

### Priority Migration (0-100% → 1-5)
- [x] **LT-08**: Migrate priority from 0-100 percentage to 1-5 score (default: 3). Update Topic interface, add DB migration (map 0→1, 1-25→2, 26-50→3, 51-75→4, 76-100→5). Update TopicList priority badge UI, recommendation hook, dashboard allocation charts, and weekly reports.

### Spaced Repetition & Study Queue
- [x] **LT-20**: Add SR state to Topic model — `lastActivityDate`, `currentInterval` fields. DB migration.
- [ ] **LT-21**: Reset SR clock on any topic activity — wire into `logTime`, `completeTopic`, and item done handler.
- [ ] **LT-22**: Implement priority-scaled max intervals (P5=3d, P4=7d, P3=14d, P2=21d, P1=30d).
- [ ] **LT-23**: Build `useStudyQueue` hook — rank active topics by `urgency = daysSinceLastActivity / maxInterval(priority)`. Replace existing recommendation hook.
- [ ] **LT-24**: Add "mark as studied" action in study queue (resets SR clock without logging time — for offline/untracked study).

### Dashboard & Detail Updates
- [ ] **LT-30** (update): Add study queue section at the top of the learning dashboard. Show urgency scores, overdue indicators.
- [ ] **LT-31** (update): Add SR status to topic detail view — next review date, urgency score, days since last activity.

### Learning Notes
- [ ] **LT-34**: Add markdown notes field to topics and items. DB migration. Notes stored as plain markdown strings.
- [ ] **LT-35**: Add optional "what did you learn?" prompt when completing a subtask — saves note on the item.
- [ ] **LT-36**: Show most recent notes when study queue surfaces a topic (inline preview in queue card).
- [ ] **LT-37**: Markdown rendering for notes — support headings, lists, code blocks, links (use react-markdown or similar).

## Medium Priority — Content & Workflow

### YouTube Playlist Import
- [ ] **LT-38**: Add playlist import UI — input field for YouTube playlist URL, triggers server-side fetch.
- [ ] **LT-39**: Parse playlist via YouTube API/scraping — extract video titles and durations.
- [ ] **LT-3A**: Review step — show list of videos with checkboxes, user deselects unwanted ones, then confirm to bulk-create items assigned to topic.

### Topic Dependencies
- [ ] **LT-3B**: Add `dependsOn: string[]` (topic IDs) to Topic model. DB migration. UI to set prerequisites (dropdown picker).
- [ ] **LT-3C**: Study queue filters out topics whose prerequisites are not completed.
- [ ] **LT-3D**: Show prerequisite and dependent topics in topic detail view (links, completion status).
- [ ] **LT-3E**: Validate no circular dependencies when adding a prerequisite (DFS cycle detection).

### Session Timer
- [ ] **LT-3F**: Timer component — start button on study queue cards and topic detail. Stores active timer in state (topicId, startTime).
- [ ] **LT-3G**: Persistent timer display in header/status bar — shows elapsed time, topic name. Survives page navigation.
- [ ] **LT-3H**: Stop button logs elapsed seconds to topic via existing `logTime`, resets SR clock.
- [ ] **LT-3I**: Optional Pomodoro mode — configurable work/break intervals (default 25/5 min). Audio/visual notification on interval end.
- [ ] **LT-3J**: Pomodo.ink integration — shared session data, graph visualization (v2, defer).

## Lower Priority — Integrations

### REST API
- [ ] **LT-50**: `GET/POST/PUT/DELETE /api/topics` — topic CRUD
- [ ] **LT-51**: `GET/POST/DELETE /api/topics/:id/subtasks` — subtask management, `PATCH /api/items/:id` mark done
- [ ] **LT-52**: `POST /api/topics/:id/time` — log time, `GET /api/topics/:id/timelogs` — query logs
- [ ] **LT-53**: `GET/POST/PUT /api/notes` — notes CRUD on topics and items
- [ ] **LT-54**: `GET /api/study-queue` — ranked queue, `POST /api/study-queue/:id/studied` — mark session
- [ ] **LT-55**: API key auth — generate/revoke keys in settings, middleware to validate on all `/api/` routes
- [ ] **LT-56**: Document API endpoints (OpenAPI spec or equivalent)

### MCP Server
Depends on: REST API (LT-50–55)
- [ ] **LT-70**: MCP server scaffold — standalone process, `npx laterlist-mcp`, connects to laterlist API
- [ ] **LT-71**: Tool: `create_topic` — name, priority
- [ ] **LT-72**: Tool: `list_topics` — status, priority, SR urgency, remaining time
- [ ] **LT-73**: Tool: `add_subtask` — URL or manual, triggers enrichment
- [ ] **LT-74**: Tool: `complete_subtask` — mark done, auto-log time
- [ ] **LT-75**: Tool: `log_time` — log time to topic
- [ ] **LT-76**: Tool: `add_note` — markdown note on topic or subtask
- [ ] **LT-77**: Tool: `get_study_queue` — ranked queue with urgency
- [ ] **LT-78**: Tool: `mark_studied` — reset SR clock
- [ ] **LT-79**: Tool: `search` — keyword search across topics, subtasks, notes
- [ ] **LT-7A**: Tool: `get_topic_detail` — full topic with subtasks, notes, logs, SR, deps
- [ ] **LT-7B**: Tool: `bulk_import` — multiple subtasks at once
- [ ] **LT-7C**: Resource: `laterlist://study-queue`
- [ ] **LT-7D**: Resource: `laterlist://topic/{id}`

### Calendar Integration
- [ ] **LT-60**: Google Calendar OAuth connect
- [ ] **LT-61**: Proton Calendar connect
- [ ] **LT-62**: Push subtasks as time-blocked calendar events
- [ ] **LT-63**: Suggest calendar slots from free time + daily goal
- [ ] **LT-64**: Bidirectional completion sync

## Completed

### Core save-for-later (pre-learning tracker)
- [x] Save URLs with AI-enriched metadata (title, category, tags, duration)
- [x] Mark done, filter, reorder, group by color
- [x] Dark mode, cloud sync, export/import

### Data Model (shipped)
- [x] **LT-01**: Learning topics — create, rename, delete
- [x] **LT-02**: Assign items to topics (many-to-many via topicIds)
- [x] **LT-03**: URL enrichment — YouTube duration scraping, article read time estimation
- [x] **LT-04**: Manual duration input on non-URL items
- [x] **LT-05**: Topic time = sum of subtask durations (current implementation)
- [x] **LT-06**: Manual topic time estimate (estimatedSeconds field, DB v8)
- [x] **LT-07**: Dexie Cloud sync
- [x] **LT-09**: Items exist without topics (always supported)

### Time Tracking (shipped)
- [x] **LT-10**: Auto-log duration on item completion
- [x] **LT-11**: Manual time logging against topics
- [x] **LT-12**: Remaining time per topic (progress bars)
- [x] **LT-13**: Mark topic complete/reopen

### Smart Features (shipped)
- [x] **LT-25**: Daily learning goal (minutes per day)
- [x] **LT-26**: Consecutive-day learning streaks
- [x] **LT-27**: Learning velocity and projected completion dates

### UX (shipped)
- [x] **LT-30**: Learning dashboard with weekly activity chart and topic allocation
- [x] **LT-31**: Topic detail view with items, time stats, activity log
- [x] **LT-32**: Weekly/monthly reports with time allocation analysis
- [x] **LT-33**: Export learning data as JSON or CSV

## Notes
- LT-08 (priority migration) should be done first — SR and study queue depend on 1-5 scores
- LT-20–24 (SR & study queue) is the most impactful block — core differentiator of the app
- MCP server depends on REST API — build API first
- Calendar integration is lowest priority — defer to last
- Session timer LT-3J (pomodo.ink integration) is v2, skip for now
