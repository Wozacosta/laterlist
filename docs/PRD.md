# laterlist — Product Requirements Document

## Vision

laterlist saves content for later. But saving isn't the goal — **learning is**. The next evolution connects the content you save to the knowledge you're building, so you can track what you've actually learned, not just what you've bookmarked.

## What exists today

### Core save-for-later

- Save URLs (videos, articles, papers, repos, podcasts, docs)
- AI-enriched metadata: title, category, tags, estimated read/watch time
- Mark items as done, filter, reorder, group by color
- Total unread time counter
- Cloud sync (Dexie Cloud), local-first, dark mode
- Export/import data as JSON backup

### Learning tracker (shipped)

- Learning topics — create, rename, delete, mark complete
- Assign items to one or more topics (many-to-many)
- Add non-URL learning items with manual duration
- Time tracking — auto-log on item completion + manual logging
- Progress bars and remaining time per topic
- Weighted priority percentages (0-100%) with drift tracking
- Daily learning goals, consecutive-day streaks
- Smart recommendations based on priority drift, recency, actionability
- Learning velocity and projected completion dates
- Learning dashboard with weekly activity chart and topic allocation
- Topic detail view with items, time stats, activity log
- Weekly/monthly reports with time allocation analysis
- Export learning data as JSON or CSV

## What's next

### Architecture: Items vs Subtasks

**Items** are the base entity. They can exist standalone (a saved article with no topic) or be assigned to one or more topics. When an item belongs to a topic, it appears as a **subtask** in that topic's detail view. "Subtask" is a UI concept, not a separate data model — it's just an item with a topic assignment.

- Items can exist without any topic (plain save-for-later)
- Items can belong to multiple topics (a "GraphQL + Rust" article could be a subtask of both)
- Topics are parent containers — they have no URL themselves
- Topics can exist with zero subtasks (placeholder for future content)

### Core Concepts

- **Topics** — high-level learning goals (e.g. "Rust", "System Design", "GraphQL"). A topic is a parent container with no item/URL of its own. Example: "GraphQL" is the topic; "GraphQL tutorial XYZ", "GraphQL video by ABC", "Build a GraphQL API ~5h" are its subtasks.
- **Subtasks** — items assigned to a topic. Can be URLs (with auto-detected duration for videos/articles) or manual entries with a user-provided time estimate. A topic's total estimated time is either a manual override or the sum of its subtasks' durations.
- **Time logging** — log time spent on learning (auto-populated from subtask durations when marked done, or manual entry against a topic)
- **Progress tracking** — see remaining time per topic, per subtask, and overall
- **Priority score** — each topic has a 1–5 priority score (manually set, default 3). Replaces the old 0-100% weighted allocation. Higher = more important.
- **Spaced repetition** — topics are surfaced for study using a priority-weighted recency algorithm. Any activity on a topic (logging time, completing a subtask) resets its clock. The maximum interval before a topic resurfaces scales with priority: priority 5 topics resurface within a few days, priority 1 topics can go weeks. This prevents topics from getting lost.
- **Study queue** — an ordered list of "what to study next", ranked by combining priority score and how overdue a topic is. High-priority + overdue topics surface first.
- **Learning notes** — markdown notes on topics and subtasks. Capture takeaways, context, and "where I left off." Surfaced when a topic comes up in the study queue.
- **Topic dependencies** — prerequisite chains between topics. The study queue won't surface a topic until its prerequisites are complete.
- **Session timer** — start/stop timer against a topic that auto-logs elapsed time. Optional Pomodoro mode with work/break intervals. Possible integration with pomodo.ink.
- **Streaks** — consecutive-day learning tracking with daily goals
- **Velocity & projections** — learning pace and estimated completion dates
- **API** — full REST API for topics, subtasks, time logs, notes, and study queue. Foundation for all external integrations.
- **MCP Server** — Model Context Protocol server that lets AI agents (Claude Code, Cursor, etc.) interact with laterlist natively. Add topics, log time, query the study queue, import content — all through natural conversation with an agent.

### How it connects to existing features

| Existing feature | Learning extension |
|---|---|
| Save a URL | Optionally assign as a subtask under a learning topic |
| Estimated duration | Feeds into topic time estimates (summed from subtasks) |
| Mark as done | Auto-logs the estimated duration as time spent, resets SR clock |
| Tags | Topics can auto-group by tags |
| Groups | Learning topics can be a group type |
| Unread time counter | Extends to "time remaining per topic" |

### Requirements

#### Data Model

- [ ] **LT-01**: User can create learning topics with a name (parent container, no item/URL required)
- [ ] **LT-02**: User can add subtasks to a topic — either a URL (video, article, etc.) or a manual entry. Subtasks are items; an item can be a subtask of multiple topics.
- [ ] **LT-03**: URL subtasks auto-detect duration (YouTube video length, article read time via existing enrichment)
- [ ] **LT-04**: Non-URL/non-article subtasks (e.g. online tutorials, projects) have a manually inputted time estimate
- [ ] **LT-05**: A topic's total estimated time is the sum of its subtasks' durations. If a manual estimate is set on the topic (LT-06), it takes precedence.
- [ ] **LT-06**: User can optionally set a manual total time estimate on a topic (e.g. "30 hours") — remaining time = estimate minus time spent. Falls back to subtask sum when not set.
- [ ] **LT-07**: All learning data persists locally and syncs via Dexie Cloud
- [ ] **LT-08**: User can set a 1–5 priority score on each topic (default: 3)
- [ ] **LT-09**: Items can exist without belonging to any topic (standalone save-for-later)

#### Time Tracking

- [ ] **LT-10**: Marking a subtask as done auto-logs its duration as time spent on the linked topic(s)
- [ ] **LT-11**: User can manually log time against a topic
- [ ] **LT-12**: User can see remaining time per topic (estimated minus spent)
- [ ] **LT-13**: User can mark a topic as complete — completed topics exit the study queue. Reopening a topic re-enters it.

#### Spaced Repetition & Study Queue

- [ ] **LT-20**: Each topic tracks its SR state: last activity date and current interval
- [ ] **LT-21**: Any activity on a topic resets its SR clock (logging time, completing a subtask)
- [ ] **LT-22**: SR interval scales with priority score — priority 5 resurfaces within ~3 days, priority 1 can go ~4 weeks. Suggested scale:

  | Priority | Max interval |
  |----------|-------------|
  | 5        | 3 days      |
  | 4        | 7 days      |
  | 3        | 14 days     |
  | 2        | 21 days     |
  | 1        | 30 days     |

- [ ] **LT-23**: App shows a ranked study queue: topics ordered by `urgency = daysSinceLastActivity / maxInterval(priority)`. Urgency > 1.0 means overdue.
- [ ] **LT-24**: User can mark a study session from the queue (for offline/untracked study — e.g. reading a textbook) which resets the SR clock without logging specific time

#### Smart Features

- [ ] **LT-25**: User can set a daily learning goal (minutes per day)
- [ ] **LT-26**: App tracks consecutive-day learning streaks
- [ ] **LT-27**: App shows learning velocity and projected completion dates per topic

#### AI Daily Recommendations

- [ ] **LT-28**: App generates a personalized "today's learning plan" — a short list of recommended topics and subtasks for the day, based on study queue urgency, priority, available time (daily goal), and recent activity patterns
- [ ] **LT-29**: Recommendations include a brief AI-generated rationale for each suggestion (e.g. "You haven't touched Rust in 5 days and you have a 45-min video queued up")

#### UX

- [ ] **LT-30**: Learning dashboard view — study queue at the top, topics with progress bars, streak counter
- [ ] **LT-31**: Topic detail view — subtasks, time logged, remaining, SR status (next review date, urgency)
- [ ] **LT-32**: Weekly/monthly report — time allocation across topics
- [ ] **LT-33**: Export learning data

#### Quick Add

The current item creation flow requires going to the main page. Items (subtasks) should be addable directly from the learning page and topic detail views — fewer clicks, less context-switching.

- [ ] **LT-40**: Add item input available on the learning dashboard (not just the main page)
- [ ] **LT-41**: Add item input available in topic detail view — items created here are auto-assigned to that topic
- [ ] **LT-42**: Inline quick-add: a single text field that accepts a URL or plain text title, auto-detects which mode to use
- [ ] **LT-43**: After adding an item from the learning page (not inside a topic), prompt user to optionally assign it to a topic immediately

#### Learning Notes

- [ ] **LT-34**: Each subtask and topic can have markdown notes attached
- [ ] **LT-35**: User can write/edit notes when completing a subtask (optional prompt: "what did you learn?")
- [ ] **LT-36**: When the study queue surfaces a topic, its most recent notes are shown so the user remembers context and where they left off
- [ ] **LT-37**: Notes support standard markdown (headings, lists, code blocks, links)

#### YouTube Playlist Import

- [ ] **LT-38**: User can paste a YouTube playlist URL to bulk-import subtasks
- [ ] **LT-39**: Each video in the playlist becomes a subtask under the selected topic, with title and duration auto-detected
- [ ] **LT-3A**: User can review and deselect videos before confirming the import

#### Topic Dependencies

- [ ] **LT-3B**: User can set prerequisite relationships between topics ("learn X before Y")
- [ ] **LT-3C**: The study queue respects dependencies — a topic doesn't surface until its prerequisites are complete
- [ ] **LT-3D**: Topic detail view shows prerequisite and dependent topics
- [ ] **LT-3E**: Circular dependencies are prevented at creation time

#### Session Timer

- [ ] **LT-3F**: User can start a timer against a topic from the study queue or topic detail view
- [ ] **LT-3G**: Timer runs in the background (visible in header/status bar) with elapsed time
- [ ] **LT-3H**: Stopping the timer auto-logs the elapsed time to the topic and resets the SR clock
- [ ] **LT-3I**: Optional Pomodoro mode — configurable work/break intervals (default 25/5 min)
- [ ] **LT-3J**: Possible integration with pomodo.ink (shared timer infrastructure, session graph visualization — v2)

#### API

- [ ] **LT-50**: REST API for topic CRUD — create, read, update, delete topics
- [ ] **LT-51**: REST API for subtask CRUD — add/remove subtasks under topics, mark done
- [ ] **LT-52**: REST API for time logging — log time against a topic, query time logs
- [ ] **LT-53**: REST API for notes — create/read/update notes on topics and subtasks
- [ ] **LT-54**: REST API for study queue — get the current ranked queue, mark a session done
- [ ] **LT-55**: API authentication via API keys (per-user, manageable from settings)
- [ ] **LT-56**: API enables external integrations: Obsidian vault scripts, browser extensions, CLI tools

#### MCP Server

An MCP (Model Context Protocol) server that lets AI agents (Claude Code, Cursor, custom agents) interact with laterlist directly. Built on top of the REST API (LT-50–55). The agent becomes a first-class way to manage your learning — add topics from conversation context, bulk-import from Obsidian, ask what to study next, log time by just saying so.

- [ ] **LT-70**: MCP server exposing laterlist tools, packaged as a standalone process (e.g. `npx laterlist-mcp`)
- [ ] **LT-71**: Tool: `create_topic` — create a topic with name and priority
- [ ] **LT-72**: Tool: `list_topics` — list all topics with status, priority, SR urgency, remaining time
- [ ] **LT-73**: Tool: `add_subtask` — add a URL or manual subtask to a topic (triggers enrichment for URLs)
- [ ] **LT-74**: Tool: `complete_subtask` — mark a subtask done, auto-logs time
- [ ] **LT-75**: Tool: `log_time` — log time against a topic (e.g. "45 minutes on Rust")
- [ ] **LT-76**: Tool: `add_note` — add a markdown note to a topic or subtask
- [ ] **LT-77**: Tool: `get_study_queue` — return the ranked study queue with urgency scores
- [ ] **LT-78**: Tool: `mark_studied` — mark a topic as studied (resets SR clock)
- [ ] **LT-79**: Tool: `search` — search across topics, subtasks, and notes by keyword
- [ ] **LT-7A**: Tool: `get_topic_detail` — get full topic detail: subtasks, notes, time logs, SR state, dependencies
- [ ] **LT-7B**: Tool: `bulk_import` — import multiple subtasks at once (e.g. from an Obsidian vault export or a list of URLs)
- [ ] **LT-7C**: Resource: `laterlist://study-queue` — live study queue as an MCP resource for agent context
- [ ] **LT-7D**: Resource: `laterlist://topic/{id}` — topic detail as an MCP resource

Example agent interactions:
- "I just finished reading this article about GraphQL subscriptions" → agent calls `complete_subtask` + `add_note`
- "What should I study today?" → agent calls `get_study_queue`, suggests top topics with context from notes
- "Import all the links from my Obsidian learning folder" → agent reads vault, calls `bulk_import`
- "Create a Kubernetes topic, priority 4, add these 3 YouTube videos" → agent calls `create_topic` + `add_subtask` x3
- "I spent an hour reading the Rust book" → agent calls `log_time`

#### Calendar Integration

The calendar is not a manual "push this item" tool. It's an **automatic daily scheduler**: laterlist checks your calendar for free time, picks the most urgent topic from your study queue, and blocks off learning time for you every day. The user connects once, sets a daily goal, and the calendar stays populated.

- [ ] **LT-60**: Connect Google Calendar account (OAuth)
- [ ] **LT-61**: Connect Proton Calendar account
- [ ] **LT-62**: Auto-schedule daily learning block — each day, find the next free slot on the user's calendar and create a time-blocked event for the top study queue topic (highest urgency). Event title: topic name + subtask title if applicable. Duration: daily learning goal (default 1h).
- [ ] **LT-63**: Smart slot selection — pick free time based on calendar availability, preferred hours (configurable), and daily goal. If no single block fits, split across multiple shorter slots.
- [ ] **LT-64**: Sync completion status — marking done in laterlist removes/completes the calendar event. Deleting/declining the event in the calendar skips that day (no laterlist side effect).

#### Testing

##### E2E Tests

End-to-end tests covering critical user flows through the full app (browser-based).

- [ ] **LT-80**: E2E test: create a topic, add subtasks (URL + manual), mark a subtask done, verify time is logged
- [ ] **LT-81**: E2E test: study queue flow — topic surfaces when overdue, mark as studied, verify it exits the queue
- [ ] **LT-82**: E2E test: quick-add from learning page and topic detail view
- [ ] **LT-83**: E2E test: learning dashboard renders correctly — study queue, progress bars, streak, recommendations

##### Integration Tests (PRD Coverage)

Integration tests that validate each PRD requirement is met. Tests are organized by requirement ID and serve as a living spec.

- [ ] **LT-84**: Integration tests for data model requirements (LT-01 through LT-09) — topic CRUD, subtask assignment, priority scores, many-to-many relationships
- [ ] **LT-85**: Integration tests for time tracking requirements (LT-10 through LT-13) — auto-logging on completion, manual logging, remaining time calculation, topic completion
- [ ] **LT-86**: Integration tests for spaced repetition & study queue (LT-20 through LT-24) — SR clock reset, interval scaling by priority, queue ranking by urgency
- [ ] **LT-87**: Integration tests for learning notes (LT-34 through LT-37) — markdown notes on topics/subtasks, "what did you learn?" prompt, note rendering
- [ ] **LT-88**: Integration test coverage report mapped to PRD requirement IDs — ensures no requirement is untested

#### Developer Tooling

- [ ] **LT-90**: CLI/UI command to fill the app with realistic mock data — topics at various stages, subtasks (URLs + manual), time logs, notes, SR states, streaks. Useful for development, demos, and testing.
- [ ] **LT-91**: Mock data is deterministic (seeded) so screenshots and tests are reproducible

### Migration from current system

- **Priority**: Map existing 0-100% values to 1-5 scale (0→1, 1-25→2, 26-50→3, 51-75→4, 76-100→5). Default for new topics: 3.
- **Items → Subtasks**: No data migration needed. Items already assigned to topics via `topicIds[]` continue to work as subtasks. The many-to-many relationship is preserved.
- **Recommendation → Study Queue**: The existing recommendation hook (priority drift + recency + actionability scoring) is replaced by the simpler SR urgency formula.

### Out of Scope (v1)

- Social features / sharing progress
- ML-based predictions — simple pace-based projections are enough
- Gamification (badges, points) — streaks and velocity provide genuine signal
- Flashcard-style spaced repetition (reviewing learned material) — the SR system here is for topic scheduling, not memory testing
- Pomodo.ink session graph visualization in laterlist (v2, via LT-3J)

### Future / v2 Ideas

- **Obsidian integration** — laterlist handles the input (what to consume, time tracking, progress) and Obsidian handles the output (what you learned, connected notes). With the MCP server, an agent can read your Obsidian vault and push content into laterlist in one conversation. Possible features: auto-create a note in an Obsidian vault when marking an item done, link learning topics to Obsidian folders, bidirectional sync via MCP + Obsidian plugins.
- **Browser extension** — quick-save from any page directly as a subtask under a topic, without opening laterlist. Can be built on top of the API.
- **Progress milestones** — set checkpoints within a topic ("finish first 10 chapters", "build first project") as intermediate goals with their own completion state.
- **Pomodo.ink deep integration** — shared timer infrastructure, session graph visualization embedded in laterlist's dashboard.

### Key Difference from CLI version

This is the **web-native** version of the same idea. Instead of a standalone Rust CLI, learning tracking is integrated directly into laterlist where the content already lives. The content queue *is* the learning backlog — no double entry needed.
