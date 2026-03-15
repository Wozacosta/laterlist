# laterlist

Save URLs for later — enriched, tagged, and synced across devices.

Live at **[laterlist.cc](https://laterlist.cc)**

## Features

- **Paste any URL** — YouTube, articles, papers, repos, podcasts, docs
- **AI enrichment** — fetches metadata and uses OpenAI to infer title, category, tags, and read/watch time (requires sign-in)
- **Local-first** — all data lives in IndexedDB, works offline instantly
- **Cloud sync** — sign in with email or Google to back up and sync across devices (powered by Dexie Cloud)
- **Drag to reorder** — prioritize your reading queue
- **Tag editing** — add/remove tags inline on any item
- **Notes** — click a row to expand and add a note
- **Filter** — by category and/or tags
- **Auto-archive** — items marked done disappear after 7 days
- **Export / Import** — download a full JSON backup, restore anytime
- **Dark mode** — auto follows system, toggle to light/dark/system
- **Duplicate detection** — warns before saving the same URL twice

## Stack

- **Next.js 16** + TypeScript (App Router)
- **Dexie 4** + `dexie-cloud-addon` — local-first IndexedDB with optional cloud sync
- **dexie-react-hooks** — reactive `useLiveQuery` for live UI updates
- **@dnd-kit** — drag-and-drop reordering
- **AI SDK** + **OpenAI** (`gpt-4o-mini`) — category and tag inference via `generateObject`
- **Tailwind CSS v4** — styling with auto dark mode
- **Vitest** — unit tests (19 passing)

## Getting Started

```bash
pnpm install
```

Copy the env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_DEXIE_CLOUD_URL=https://yourdb.dexie.cloud   # optional, for sync
```

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Cloud Sync (optional)

To enable cross-device sync, provision a free Dexie Cloud database:

```bash
npx dexie-cloud create
npx dexie-cloud whitelist http://localhost:3000
```

Then set `NEXT_PUBLIC_DEXIE_CLOUD_URL` in `.env.local` to your database URL.

## Notes on AI enrichment

- Only runs when the user is **signed in** — anonymous users can still save URLs, just without AI tagging
- Rate limited to **10 requests / minute per IP**
- Uses `gpt-4o-mini` for cost efficiency

## Tests

```bash
pnpm test
```
