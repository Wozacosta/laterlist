---
title: 'laterlist MVP'
slug: 'laterlist-mvp'
created: '2026-03-15'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Next.js 15 + TypeScript (App Router)
  - Dexie 4 + dexie-react-hooks (NO dexie-cloud-addon for v1)
  - '@dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities'
  - Tailwind CSS v4
  - 'ai (Vercel AI SDK) + @ai-sdk/anthropic'
  - Next.js App Router API routes (route.ts)
  - Vitest + fake-indexeddb + @testing-library/react
  - pnpm
files_to_modify:
  - package.json (CREATE)
  - next.config.ts (CREATE)
  - src/test-setup.ts (CREATE)
  - vitest.config.ts (CREATE)
  - .env.local (CREATE)
  - src/db/index.ts (CREATE)
  - src/lib/archive.ts (CREATE)
  - src/hooks/useItems.ts (CREATE)
  - src/app/api/enrich/metadata.ts (CREATE)
  - src/app/api/enrich/ai.ts (CREATE)
  - src/app/api/enrich/route.ts (CREATE)
  - src/components/AddItemInput.tsx (CREATE)
  - src/components/TagChips.tsx (CREATE)
  - src/components/FilterBar.tsx (CREATE)
  - src/components/ItemRow.tsx (CREATE)
  - src/components/ItemList.tsx (CREATE)
  - src/app/page.tsx (CREATE)
  - src/app/layout.tsx (CREATE)
code_patterns:
  - useLiveQuery for all reactive reads from Dexie
  - Direct async Dexie writes (no optimistic updates)
  - React.memo + useCallback + useMemo on all components and callbacks
  - String UUID primary keys prefixed by entity (itm + crypto.randomUUID())
  - bulkUpdate for sortOrder reorder on dnd-kit dragEnd
  - Next.js App Router route.ts for API routes
  - generateObject from ai SDK for structured AI output (not generateText + JSON.parse)
  - sortOrder = Date.now() for new items, ordered descending
test_patterns:
  - Vitest + happy-dom environment
  - fake-indexeddb/auto in test-setup.ts
  - '@testing-library/jest-dom/vitest in test-setup.ts'
  - renderHook from @testing-library/react for hook tests
  - waitFor to await useLiveQuery re-renders after writes
---

# Tech-Spec: laterlist MVP

**Created:** 2026-03-15

## Overview

### Problem Statement

Too many saved YouTube videos and articles with no good way to track them, categorize them, or remember why they were saved. Existing tools (browser bookmarks, YouTube Watch Later) lack enrichment, tagging, personal notes, and status tracking.

### Solution

A local-first web app where you paste a URL, get an auto-enriched item (title, thumbnail, duration/read-time, AI-suggested tags, category), and manage everything in a single filterable compact list with drag-to-reorder and personal scratchpad notes per item.

### Scope

**In Scope:**
- Paste URL → auto-enrich: title, thumbnail, duration/read-time, date added
- AI auto-categorization: `video` / `article` / `paper` / `repo` / `podcast` / `doc` / `other`
- AI auto-tagging (Claude via AI SDK), manually tweakable inline
- Compact list view: `[thumbnail] title [tags] [duration] [date] [✓]`
- Drag & drop manual reordering (dnd-kit)
- Personal scratchpad notes per item (inline, saves on blur)
- Mark as watched/read → greyed out → auto-archived after 7 days (hidden)
- Filter by tag and/or category (combinable)
- Local-first storage: Dexie 4 (IndexedDB)
- YouTube metadata via oEmbed + page scrape for duration (no API key)
- Article read-time via server-side word count; OG image for thumbnail
- Next.js 15 + TypeScript, App Router

**Out of Scope:**
- User accounts / auth
- Social or sharing features
- Import from YouTube watch later / bookmarks / Notion
- Mobile app
- Dexie Cloud sync (v1 is local only)

---

## Context for Development

### Codebase Patterns

Mirror exactly from `/Users/samyrabah-montarou/Code/progress`:

- **Dexie as sole source of truth** — no Redux, no Zustand, no React Context for data. All reads via `useLiveQuery`, all writes are direct async Dexie calls.
- **Reactive reads** — `useLiveQuery(() => db.items.orderBy("sortOrder").reverse().toArray())` auto-rerenders on any DB change. `undefined` = loading sentinel.
- **No optimistic updates** — IndexedDB writes are fast and local; write fires `useLiveQuery` → React re-renders automatically.
- **Custom hook per entity** — `useItems.ts` owns all CRUD + business logic for the `items` table.
- **String UUID primary keys** — `"itm" + crypto.randomUUID()`, `@id` prefix in Dexie schema for UUID-keyed tables.
- **`React.memo` + `useCallback` + `useMemo`** everywhere to prevent unnecessary re-renders.
- **`fake-indexeddb/auto`** imported in test setup — polyfills IndexedDB in Node.
- **dnd-kit** for drag & drop: `DndContext` + `SortableContext` + `useSortable` + `verticalListSortingStrategy`. On `onDragEnd`, compute new `sortOrder` integers and call `bulkUpdate`.
- **Tailwind CSS v4** for all styling.
- **AI SDK `generateObject`** called server-side in a Next.js API route — never client-side.

### Files to Reference

| File | Purpose |
|------|---------|
| `/Users/samyrabah-montarou/Code/progress/src/db/index.ts` | Exact Dexie v4 schema: `@id` UUID keys, typed table interface, export pattern |
| `/Users/samyrabah-montarou/Code/progress/src/hooks/useHabits.ts` | Exact hook pattern: `useLiveQuery`, `useCallback` CRUD, `bulkUpdate` reorder, prefixed UUID IDs |
| `/Users/samyrabah-montarou/Code/progress/src/components/GridContainer.tsx` | dnd-kit full integration: `DndContext`, `SortableContext`, `useSortable`, dragEnd handler |
| `/Users/samyrabah-montarou/Code/progress/src/test-setup.ts` | Exact: `import "fake-indexeddb/auto"` + `import "@testing-library/jest-dom/vitest"` |
| `/Users/samyrabah-montarou/Code/progress/api/ai.ts` | AI SDK `generateText` call pattern — adapt: swap provider to `anthropic`, use `generateObject` |
| `/Users/samyrabah-montarou/Code/progress/package.json` | Exact dependency versions for dexie, dnd-kit, ai SDK, vitest, testing libs |

### Technical Decisions

1. **No YouTube API key** — `https://www.youtube.com/oembed?url=<url>&format=json` returns `title`, `thumbnail_url`, `author_name`. For duration: server-side `fetch("https://www.youtube.com/watch?v=<videoId>")` then regex `/"lengthSeconds":"(\d+)"/` on the HTML to extract duration from `ytInitialPlayerResponse`. Fallback: `null` (display `–`).
2. **Article enrichment** — Server-side `fetch(url)` with headers spoofing a browser UA. Extract `og:title`, `og:image`, `og:description` from HTML meta tags via regex. Strip all HTML tags, count words, divide by 200 wpm → `duration` in seconds.
3. **Single `/api/enrich` route** — One POST `{ url: string }` → metadata + AI in sequence → returns `{ title, thumbnail, duration, category, tags }`. Avoids multiple client round-trips.
4. **AI model + structured output** — `generateObject` from `ai` SDK with `@ai-sdk/anthropic`, model `claude-3-5-haiku-20241022`. Schema: `z.object({ category: z.enum([...]), tags: z.array(z.string()).max(5) })`. Prompt includes title + description for context.
5. **7-day archive logic** — `isArchived(item)` = `item.status === "done" && item.doneAt !== undefined && Date.now() - new Date(item.doneAt).getTime() > 7 * 24 * 60 * 60 * 1000`. Applied as filter inside `useItems` before returning `items` to components.
6. **Tag editing** — `TagChips` component: each chip has an `×` button → calls `updateItem(id, { tags: tags.filter(t => t !== chip) })`. A `+` button toggles a small `<input>`, on Enter/blur adds tag if non-empty and not duplicate.
7. **Notes** — `ItemRow` has an expand toggle. When expanded shows `<textarea defaultValue={item.notes} onBlur={(e) => updateItem(id, { notes: e.target.value })} />`. No modal.
8. **sortOrder** — New items: `sortOrder = Date.now()`. List query: `orderBy("sortOrder").reverse()` so newest = top. After drag: recompute all visible items' sortOrder as evenly spaced integers and `bulkUpdate`.
9. **Dexie schema** — Single version `v1`, `@id` UUID keys. No migrations needed for v1. No cloud addon.
10. **Filter state** — `useState<{ category: Category | null; tags: string[] }>` in `page.tsx`. Filtering applied client-side against the live `items` array from `useItems`. Not persisted (resets on reload).

---

## Implementation Plan

### Tasks

#### Phase 1 — Project Scaffold

- [x] **Task 1: Initialize Next.js project and install dependencies**
  - File: `package.json`
  - Action: Create Next.js 15 project with `pnpm create next-app@latest`. Install deps:
    - `dexie@^4.3.0`, `dexie-react-hooks@^4.2.0`
    - `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2`
    - `ai@^6.0.0`, `@ai-sdk/anthropic@^1.0.0`
    - `zod` (for `generateObject` schema)
    - Dev: `vitest`, `@vitest/ui`, `happy-dom`, `fake-indexeddb`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
  - Notes: Use `pnpm`. Select TypeScript, Tailwind, App Router, `src/` directory. No ESLint prompt needed.

- [x] **Task 2: Configure Vitest**
  - File: `vitest.config.ts`
  - Action: Create with `environment: "happy-dom"`, `globals: true`, `setupFiles: ["./src/test-setup.ts"]`. Exclude `e2e/` and `node_modules/`.

- [x] **Task 3: Create test setup file**
  - File: `src/test-setup.ts`
  - Action: Exact copy of pattern from `progress/src/test-setup.ts`:
    ```ts
    import "fake-indexeddb/auto";
    import "@testing-library/jest-dom/vitest";
    ```

- [x] **Task 4: Create env file**
  - File: `.env.local`
  - Action: Add `ANTHROPIC_API_KEY=your_key_here`. Add `.env.local` to `.gitignore`.

---

#### Phase 2 — Data Layer

- [x] **Task 5: Define Dexie database and Item type**
  - File: `src/db/index.ts`
  - Action: Create Dexie instance `LaterlistDB` (no cloud addon). Define:
    ```ts
    type Category = "video" | "article" | "paper" | "repo" | "podcast" | "doc" | "other";

    interface Item {
      id: string;          // "itm" + crypto.randomUUID()
      url: string;
      title: string;
      thumbnail?: string;
      category: Category;
      tags: string[];
      duration?: number;   // seconds (video length or article read time)
      addedAt: string;     // ISO datetime string
      sortOrder: number;   // Date.now() on creation
      status: "unread" | "done";
      doneAt?: string;     // ISO datetime string, set when marked done
      notes?: string;
    }

    const db = new Dexie("LaterlistDB") as Dexie & {
      items: Table<Item, "id">;
    };

    db.version(1).stores({
      items: "@id, url, category, status, sortOrder, addedAt",
    });

    export { db, type Item, type Category };
    ```
  - Notes: `@id` = client-generated UUID key (Dexie v4 pattern from `progress`). Index `category` and `status` for potential future filtering at DB level, though v1 filters in JS.

- [x] **Task 6: Create isArchived pure helper**
  - File: `src/lib/archive.ts`
  - Action: Export single function:
    ```ts
    import type { Item } from "@/db";
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    export function isArchived(item: Item): boolean {
      return (
        item.status === "done" &&
        item.doneAt !== undefined &&
        Date.now() - new Date(item.doneAt).getTime() > SEVEN_DAYS_MS
      );
    }
    ```
  - Notes: Pure function, no Dexie dependency. Easy to unit test.

- [x] **Task 7: Create useItems hook**
  - File: `src/hooks/useItems.ts`
  - Action: Mirror `progress/src/hooks/useHabits.ts` pattern. Implement:
    - `const allItems = useLiveQuery(() => db.items.orderBy("sortOrder").reverse().toArray())` — loading sentinel when `undefined`
    - `const items = useMemo(() => (allItems ?? []).filter(i => !isArchived(i)), [allItems])` — active items (non-archived)
    - `const archivedItems = useMemo(() => (allItems ?? []).filter(isArchived), [allItems])` — archived items
    - `addItem(enriched: Omit<Item, "id" | "sortOrder" | "addedAt" | "status">): Promise<void>` — adds with `id = "itm" + crypto.randomUUID()`, `sortOrder = Date.now()`, `addedAt = new Date().toISOString()`, `status = "unread"`
    - `updateItem(id: string, patch: Partial<Pick<Item, "tags" | "notes" | "title">>): Promise<void>`
    - `markDone(id: string): Promise<void>` — sets `status = "done"`, `doneAt = new Date().toISOString()`
    - `unmarkDone(id: string): Promise<void>` — sets `status = "unread"`, `doneAt = undefined`
    - `deleteItem(id: string): Promise<void>`
    - `reorderItems(updates: Array<{ id: string; sortOrder: number }>): Promise<void>` — calls `db.items.bulkUpdate(...)`
    - Return: `{ items, archivedItems, isLoading: allItems === undefined, addItem, updateItem, markDone, unmarkDone, deleteItem, reorderItems }`
  - Notes: All write functions wrapped in `useCallback(async () => {...}, [])`. `useMemo` for derived arrays.

---

#### Phase 3 — API Routes

- [x] **Task 8: Create metadata helpers**
  - File: `src/app/api/enrich/metadata.ts`
  - Action: Export two functions:
    1. `fetchYouTubeMetadata(url: string): Promise<{ title: string; thumbnail: string; duration: number | null; description: string }>`:
       - Call `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json` → get `title`, `thumbnail_url`
       - Extract video ID from URL via regex `(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})`
       - Fetch `https://www.youtube.com/watch?v=${videoId}` with UA header `Mozilla/5.0 ...`
       - Regex `/"lengthSeconds":"(\d+)"/ ` on HTML → `duration = parseInt(match[1])`
       - Return `{ title, thumbnail: thumbnail_url, duration, description: "" }`
    2. `fetchArticleMetadata(url: string): Promise<{ title: string; thumbnail: string | null; duration: number; description: string }>`:
       - Fetch URL with browser UA header
       - Extract with regex: `og:title` → title fallback `<title>`, `og:image` → thumbnail, `og:description` → description
       - Strip HTML tags: `html.replace(/<[^>]+>/g, " ")`, normalize whitespace
       - Word count ÷ 200 × 60 → `duration` in seconds
       - Return `{ title, thumbnail, duration, description }`
  - Notes: Both functions should `throw` with descriptive message on fetch failure. No external HTML parsing library — regex only to keep deps minimal.

- [x] **Task 9: Create AI inference helper**
  - File: `src/app/api/enrich/ai.ts`
  - Action: Export function `inferCategoryAndTags(title: string, description: string): Promise<{ category: Category; tags: string[] }>`:
    - Use `generateObject` from `ai`, `anthropic` from `@ai-sdk/anthropic`
    - Model: `anthropic("claude-3-5-haiku-20241022")`
    - Schema (zod):
      ```ts
      z.object({
        category: z.enum(["video","article","paper","repo","podcast","doc","other"]),
        tags: z.array(z.string().toLowerCase()).min(1).max(5),
      })
      ```
    - Prompt: `"Classify this content. Title: ${title}. Description: ${description}. Return a category and 1-5 concise lowercase tags (topic keywords like 'rust', 'crypto', 'machine-learning')."`
    - Return the parsed `object`
  - Notes: `ANTHROPIC_API_KEY` read automatically by `@ai-sdk/anthropic` from `process.env`. No manual header needed.

- [x] **Task 10: Create enrich API route**
  - File: `src/app/api/enrich/route.ts`
  - Action: Export `POST` handler:
    ```ts
    export async function POST(request: Request) {
      const { url } = await request.json();
      // 1. Detect YouTube vs other
      const isYouTube = /youtube\.com|youtu\.be/.test(url);
      // 2. Fetch metadata
      const metadata = isYouTube
        ? await fetchYouTubeMetadata(url)
        : await fetchArticleMetadata(url);
      // 3. AI inference
      const { category, tags } = await inferCategoryAndTags(metadata.title, metadata.description);
      // 4. Return enriched data
      return Response.json({ title: metadata.title, thumbnail: metadata.thumbnail, duration: metadata.duration, category, tags });
    }
    ```
    - Wrap in try/catch → return `Response.json({ error: "..." }, { status: 500 })` on failure
    - Validate `url` is present and a valid URL string, return 400 if invalid
  - Notes: No auth needed. Server-side only — `ANTHROPIC_API_KEY` never exposed to client.

---

#### Phase 4 — UI Components

- [x] **Task 11: Create AddItemInput component**
  - File: `src/components/AddItemInput.tsx`
  - Action: `memo`-wrapped component. Local state: `url: string`, `loading: boolean`, `error: string | null`.
    - Renders: `<form onSubmit={handleSubmit}><input type="url" placeholder="Paste a URL..." value={url} onChange={...} /><button type="submit" disabled={loading}>{loading ? "Adding..." : "Add"}</button></form>`
    - `handleSubmit`: POST to `/api/enrich`, on success call `onAdd(enrichedData)` prop, clear input. On error set `error` state, show below input.
    - Props: `onAdd: (data: Omit<Item, "id" | "sortOrder" | "addedAt" | "status">) => void`
  - Notes: `onAdd` is called with enriched data; parent (`page.tsx`) calls `addItem` from `useItems`.

- [x] **Task 12: Create TagChips component**
  - File: `src/components/TagChips.tsx`
  - Action: `memo`-wrapped. Props: `tags: string[]`, `onRemove: (tag: string) => void`, `onAdd: (tag: string) => void`, `editable?: boolean`.
    - Renders each tag as a pill with `×` button (if `editable`). A `+` button (if `editable`) toggles an `<input>` for adding new tag.
    - On `×` click: call `onRemove(tag)`.
    - On input Enter/blur: if non-empty and not in `tags`, call `onAdd(value.trim().toLowerCase())`, clear input, hide input.
  - Notes: `editable` defaults to `true`. Kept as pure presentational component — no Dexie calls.

- [x] **Task 13: Create FilterBar component**
  - File: `src/components/FilterBar.tsx`
  - Action: `memo`-wrapped. Props: `categories: Category[]`, `allTags: string[]`, `selectedCategory: Category | null`, `selectedTags: string[]`, `onCategoryChange: (c: Category | null) => void`, `onTagToggle: (tag: string) => void`.
    - Renders category pills (including "All") and tag pills. Active = highlighted. Click to toggle.
  - Notes: Stateless — all state lives in `page.tsx`.

- [x] **Task 14: Create ItemRow component**
  - File: `src/components/ItemRow.tsx`
  - Action: `memo`-wrapped, uses `useSortable` from `@dnd-kit/sortable`. Props: `item: Item`, `onMarkDone: (id: string) => void`, `onUnmarkDone: (id: string) => void`, `onUpdateTags: (id: string, tags: string[]) => void`, `onUpdateNotes: (id: string, notes: string) => void`, `onDelete: (id: string) => void`.
    - Compact row layout (Tailwind flex): `[drag handle] [thumbnail 48x48] [title] [TagChips] [duration] [date] [✓ checkbox]`
    - Drag handle: `<button {...attributes} {...listeners}>⠿</button>` from `useSortable`
    - Thumbnail: `<img src={item.thumbnail} />` with fallback placeholder div if no thumbnail
    - Duration: format seconds → `"Xh Ym"` for video, `"X min read"` for article, `"–"` if null
    - Date: `addedAt` formatted as `"Mar 15"` using `Intl.DateTimeFormat`
    - Checkbox: `checked={item.status === "done"}`, `onChange` toggles `markDone`/`unmarkDone`
    - Done state: apply `opacity-50` Tailwind class when `item.status === "done"`
    - Expand toggle: click row body (not controls) toggles `expanded` local state
    - When expanded: show `<textarea defaultValue={item.notes ?? ""} onBlur={(e) => onUpdateNotes(item.id, e.target.value)} className="w-full..." />`
    - Delete button: small `×` visible on hover
  - Notes: `transform` and `transition` styles from `useSortable` applied to outer div for drag animation.

- [x] **Task 15: Create ItemList component**
  - File: `src/components/ItemList.tsx`
  - Action: `memo`-wrapped. Props: `items: Item[]`, `onMarkDone`, `onUnmarkDone`, `onUpdateTags`, `onUpdateNotes`, `onDelete`, `onReorder`.
    - Wraps with `<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>`
    - Inside: `<SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>`
    - `handleDragEnd(event)`: extract `active.id`, `over.id`, compute new order using `arrayMove` from `@dnd-kit/sortable`, call `onReorder` with new `{ id, sortOrder }` array (assign evenly spaced values e.g. `index * 1000`).
    - Renders `<ItemRow key={item.id} item={item} ... />` for each item.
    - Sensors: `useSensor(PointerSensor, { activationConstraint: { distance: 8 } })` + `useSensor(KeyboardSensor)`

- [x] **Task 16: Create root page**
  - File: `src/app/page.tsx`
  - Action: Client component (`"use client"`). Uses `useItems()`. Local state: `selectedCategory: Category | null = null`, `selectedTags: string[] = []`.
    - `filteredItems = useMemo(...)`: filter `items` by `selectedCategory` (if set) AND all `selectedTags` (item must include all selected tags).
    - `allTags = useMemo(...)`: deduplicated flat list of all tags across all `items`.
    - `handleAdd = useCallback(async (data) => { await addItem(data) }, [addItem])`
    - `handleUpdateTags = useCallback(async (id, tags) => { await updateItem(id, { tags }) }, [updateItem])`
    - `handleUpdateNotes = useCallback(async (id, notes) => { await updateItem(id, { notes }) }, [updateItem])`
    - Loading: if `isLoading` render spinner/skeleton.
    - Layout: `<main className="max-w-3xl mx-auto p-4"><AddItemInput onAdd={handleAdd} /><FilterBar ... /><ItemList items={filteredItems} ... /></main>`
    - Archived count shown below list: `"{archivedItems.length} archived items"` (static text for v1, no toggle to show them).

- [x] **Task 17: Create root layout**
  - File: `src/app/layout.tsx`
  - Action: Standard Next.js root layout. Import Tailwind global CSS. Set `<html lang="en">`, dark background. Title: `"laterlist"`.

---

### Acceptance Criteria

- [ ] **AC1 — Add YouTube item**
  - Given: App is running, no items in list
  - When: User pastes `https://www.youtube.com/watch?v=dQw4w9WgXcQ` into input and submits
  - Then: Item appears in list with non-empty title, thumbnail image, duration in seconds > 0, `category = "video"`, at least 1 tag, `status = "unread"`

- [ ] **AC2 — Add article item**
  - Given: App is running
  - When: User pastes a valid article URL (e.g. a blog post) and submits
  - Then: Item appears with title, thumbnail or null, duration > 0 (word count based), `category = "article"`, at least 1 tag

- [ ] **AC3 — Enrich API error handling**
  - Given: User submits an invalid or unreachable URL
  - When: Enrich API returns 400 or 500
  - Then: Error message shown below input, no item added, input not cleared

- [ ] **AC4 — Manual tag remove**
  - Given: An item with tags `["rust", "programming"]` exists
  - When: User clicks `×` on the `rust` chip
  - Then: `db.items` record updated, `tags = ["programming"]`, chip disappears immediately (re-render via `useLiveQuery`)

- [ ] **AC5 — Manual tag add**
  - Given: An item exists
  - When: User clicks `+`, types `crypto`, presses Enter
  - Then: Tag `"crypto"` added to item in IndexedDB, chip appears in row

- [ ] **AC6 — Notes persist**
  - Given: An item is expanded (notes textarea visible)
  - When: User types `"watch the part about ownership"` and clicks away (blur)
  - Then: `db.items` record has `notes = "watch the part about ownership"`, visible on next expand after page reload

- [ ] **AC7 — Drag to reorder**
  - Given: Items A, B, C in list (top to bottom)
  - When: User drags C to the top position
  - Then: List shows C, A, B; `sortOrder` values updated via `bulkUpdate`; order persists after page reload

- [ ] **AC8 — Mark as done**
  - Given: An unread item exists
  - When: User checks the done checkbox
  - Then: `status = "done"`, `doneAt` set to current ISO datetime, item renders with `opacity-50`

- [ ] **AC9 — Unmark done**
  - Given: A done item (not archived)
  - When: User unchecks the checkbox
  - Then: `status = "unread"`, `doneAt = undefined`, opacity restored

- [ ] **AC10 — Auto-archive**
  - Given: An item has `status = "done"` and `doneAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()` (8 days ago)
  - When: `useItems` hook runs
  - Then: Item is in `archivedItems`, NOT in `items`, not rendered in the main list

- [ ] **AC11 — Filter by category**
  - Given: Items with categories `video`, `article`, `video` exist
  - When: User clicks `video` in FilterBar
  - Then: Only 2 video items shown; article item hidden

- [ ] **AC12 — Filter by tag**
  - Given: Items with tags `["rust"]`, `["crypto"]`, `["rust", "crypto"]` exist
  - When: User selects tag `rust`
  - Then: Items 1 and 3 shown; item 2 hidden

---

## Additional Context

### Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "dexie": "^4.3.0",
    "dexie-react-hooks": "^4.2.0",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "~5.x",
    "vitest": "^4.0.0",
    "happy-dom": "^20.0.0",
    "fake-indexeddb": "^6.2.5",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

**Env vars:**
- `ANTHROPIC_API_KEY` — Claude API key, server-side only, never exposed to client

### Testing Strategy

**Unit tests (Vitest + fake-indexeddb):**
- `src/lib/archive.test.ts` — `isArchived`: test `unread` item → false, `done` item < 7 days → false, `done` item > 7 days → true, `done` item exactly 7 days → false (boundary)
- `src/hooks/useItems.test.ts` — `renderHook(() => useItems())`, `waitFor` after writes:
  - `addItem` → item appears in `items`
  - `markDone` → `status = "done"`, `doneAt` set
  - `unmarkDone` → `status = "unread"`, `doneAt` undefined
  - `deleteItem` → item removed from `items`
  - `reorderItems` → `sortOrder` values updated
  - archived item → appears in `archivedItems`, not `items`

**API route tests (Vitest, mocked fetch + ai SDK):**
- `src/app/api/enrich/metadata.test.ts` — mock `fetch`, test YouTube duration regex, article word count, OG tag extraction
- `src/app/api/enrich/ai.test.ts` — mock `generateObject`, test correct schema passed, correct return shape

**Manual testing checklist:**
1. Paste a YouTube URL → verify enriched item in list with thumbnail + duration
2. Paste an article URL → verify read time
3. Drag items → reload page → verify order persisted
4. Mark done → wait (or manually set `doneAt` to 8 days ago in DevTools IndexedDB) → verify archived

### Notes

- **YouTube duration scraping is fragile** — `ytInitialPlayerResponse` structure may change. If regex fails, `duration = null` and `–` displays. This is acceptable for v1.
- **Article fetch may fail due to CORS/bot protection** — server-side fetch helps (Next.js API route runs on Node), but some sites block scrapers. Fallback: title from URL path, no thumbnail, duration = null.
- **`"use client"` boundary** — `page.tsx` is a client component because it uses `useItems` (which uses `useLiveQuery`). `layout.tsx` stays server component.
- **Dexie in Next.js SSR** — Dexie uses IndexedDB which doesn't exist server-side. The `db` import must only be used inside `"use client"` components or hooks. No `db` calls in Server Components or API routes (API routes use their own fetch-based logic, not Dexie).
- **Filter UX** — Selecting multiple tags = AND logic (item must have ALL selected tags). Selecting a category filters by that category only. Category + tags filters are combined with AND.
- **v2 ideas (out of scope)**: Dexie Cloud sync across devices, browser extension for one-click save, bulk import from YouTube watch later export, keyboard shortcuts.
