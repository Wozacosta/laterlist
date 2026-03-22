# Ralph Fix Plan

> Synced with PRD: 2026-03-22. Requirement IDs match docs/PRD.md.

> **⚠️ STATUS: 55 UNCHECKED TASKS REMAIN. DO NOT EXIT. Keep working through the list below.**

## Next Up — Quick Add (Items from Learning Page)
- [x] **LT-40**: Add item input on the learning dashboard — same AddItemInput component, items created here enter the global list.
- [x] **LT-41**: Add item input in topic detail view — items created here are auto-assigned to that topic.
- [x] **LT-42**: Inline quick-add: single text field that auto-detects URL vs plain text title (no mode toggle needed).
- [x] **LT-43**: When adding from the learning dashboard (not inside a topic), prompt to optionally assign to a topic immediately.

### AI Daily Recommendations
- [x] **LT-28**: Generate a personalized "today's learning plan" — recommended topics and subtasks based on study queue urgency, priority, available time (daily goal), and recent activity patterns.
- [x] **LT-29**: Each recommendation includes a brief AI-generated rationale (e.g. "You haven't touched Rust in 5 days and you have a 45-min video queued up").

## Medium Priority — Content & Workflow

### YouTube Playlist Import
- [x] **LT-38**: Add playlist import UI — input field for YouTube playlist URL, triggers server-side fetch.
- [x] **LT-39**: Parse playlist via YouTube API/scraping — extract video titles and durations.
- [x] **LT-3A**: Review step — show list of videos with checkboxes, user deselects unwanted ones, then confirm to bulk-create items assigned to topic.

### Topic Dependencies
- [x] **LT-3B**: Add `dependsOn: string[]` (topic IDs) to Topic model. DB migration. UI to set prerequisites (dropdown picker).
- [x] **LT-3C**: Study queue filters out topics whose prerequisites are not completed.
- [x] **LT-3D**: Show prerequisite and dependent topics in topic detail view (links, completion status).
- [x] **LT-3E**: Validate no circular dependencies when adding a prerequisite (DFS cycle detection).

### Session Timer
- [x] **LT-3F**: Timer component — start button on study queue cards and topic detail. Stores active timer in state (topicId, startTime).
- [x] **LT-3G**: Persistent timer display in header/status bar — shows elapsed time, topic name. Survives page navigation.
- [x] **LT-3H**: Stop button logs elapsed seconds to topic via existing `logTime`, resets SR clock.
- [x] **LT-3I**: Optional Pomodoro mode — configurable work/break intervals (default 25/5 min). Audio/visual notification on interval end.
- [ ] **LT-3J**: Pomodo.ink integration — shared session data, graph visualization (v2, defer).

## Lower Priority — Integrations

### REST API
- [x] **LT-50**: `GET/POST/PUT/DELETE /api/topics` — topic CRUD
- [x] **LT-51**: `GET/POST/DELETE /api/topics/:id/subtasks` — subtask management, `PATCH /api/items/:id` mark done
- [x] **LT-52**: `POST /api/topics/:id/time` — log time, `GET /api/topics/:id/timelogs` — query logs
- [x] **LT-53**: `GET/POST/PUT /api/notes` — notes CRUD on topics and items
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

## Testing & Developer Tooling

### E2E Tests
- [ ] **LT-80**: E2E test: create a topic, add subtasks (URL + manual), mark a subtask done, verify time is logged.
- [ ] **LT-81**: E2E test: study queue flow — topic surfaces when overdue, mark as studied, verify it exits the queue.
- [ ] **LT-82**: E2E test: quick-add from learning page and topic detail view.
- [ ] **LT-83**: E2E test: learning dashboard renders correctly — study queue, progress bars, streak, recommendations.

### Integration Tests (PRD Coverage)
- [ ] **LT-84**: Integration tests for data model (LT-01–09) — topic CRUD, subtask assignment, priority scores, many-to-many.
- [ ] **LT-85**: Integration tests for time tracking (LT-10–13) — auto-logging, manual logging, remaining time, topic completion.
- [ ] **LT-86**: Integration tests for SR & study queue (LT-20–24) — SR clock reset, interval scaling, queue ranking.
- [ ] **LT-87**: Integration tests for learning notes (LT-34–37) — markdown notes, "what did you learn?" prompt, rendering.
- [ ] **LT-88**: Integration test coverage report mapped to PRD requirement IDs — no requirement untested.

### Developer Tooling
- [ ] **LT-90**: CLI/UI command to fill the app with realistic mock data — topics at various stages, subtasks (URLs + manual), time logs, notes, SR states, streaks.
- [ ] **LT-91**: Mock data is deterministic (seeded) so screenshots and tests are reproducible.

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
- LT-40–43 (quick add) improves daily UX — do before AI recommendations
- LT-28–29 (AI daily recommendations) depends on study queue being solid (LT-20–24 ✅)
- LT-90–91 (mock data) useful to build early — speeds up development and testing of all other features
- E2E and integration tests (LT-80–88) should be written alongside or after the features they cover
