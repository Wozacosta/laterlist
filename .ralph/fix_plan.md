# Ralph Fix Plan

## High Priority
- [x] **LT-01**: User can create learning topics with a name
- [x] **LT-02**: User can assign saved items to one or more topics
- [ ] **LT-03**: User can add learning items that aren't URLs (e.g. "build a shell in Rust ~20h")
- [ ] **LT-04**: User can set estimated duration on non-URL items
- [ ] **LT-05**: All learning data persists locally and syncs via Dexie Cloud
- [ ] **LT-10**: Marking an item as done auto-logs its duration as time spent on the linked topic
- [ ] **LT-11**: User can manually log time against a topic
- [ ] **LT-12**: User can see remaining time per topic (estimated minus spent)
- [ ] **LT-13**: User can mark a topic as complete
- [ ] **LT-20**: User can set weighted priority percentages across topics
- [ ] **LT-21**: User can set a daily learning goal (minutes per day)
- [ ] **LT-22**: App tracks consecutive-day learning streaks
- [ ] **LT-23**: App recommends what to learn next based on priority drift, streaks, recency
- [ ] **LT-24**: App shows learning velocity and projected completion dates
- [ ] **LT-30**: Learning dashboard view — topics, progress bars, streak counter
- [ ] **LT-31**: Topic detail view — items, time logged, remaining
- [ ] **LT-32**: Weekly/monthly report — time allocation vs targets
- [ ] **LT-33**: Export learning data
- [ ] **LT-40**: Connect Google Calendar account (OAuth)
- [ ] **LT-41**: Connect Proton Calendar account
- [ ] **LT-42**: Push learning items to calendar as time-blocked events (e.g. "Read: intro to X — 25min")
- [ ] **LT-43**: Suggest calendar slots based on free time and daily learning goal
- [ ] **LT-44**: Sync completion status — marking done in laterlist removes/completes the calendar event


## Medium Priority


## Low Priority


## Completed
- [x] Project enabled for Ralph
- [x] **LT-01**: User can create learning topics with a name — Added Topic model (db v3), useTopics hook, TopicList component, List/Learn view toggle
- [x] **LT-02**: User can assign saved items to one or more topics — Migrated topicId→topicIds (db v4 with *multiEntry index), added assignToTopic/unassignFromTopic to useItems, created TopicPicker component with dropdown, wired through ItemRow expanded section

## Notes
- Focus on MVP functionality first
- Ensure each feature is properly tested
- Update this file after each major milestone
