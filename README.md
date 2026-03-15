# laterlist

A local-first web app to save URLs (YouTube videos, articles, papers, anything) and read/watch them later. Items are auto-categorized using AI based on URL metadata.

## Features

- Save any URL in one click
- Auto-categorization via AI (fetches page metadata, infers category)
- Local-first: all data stored in IndexedDB, no account needed
- Filter and browse by category
- Mark items as done / archive

## Categories (auto-detected)

- `video` — YouTube, Vimeo, etc.
- `article` — blog posts, news
- `paper` — arxiv, research PDFs
- `podcast` — audio content
- `repo` — GitHub, GitLab
- `doc` — official documentation
- `other` — fallback

## Stack

- **Next.js** + TypeScript
- **IndexedDB** (via `idb`) for local-first storage
- **AI categorization** — fetches page title/description, uses an LLM to assign category

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Paste a URL into the input bar
2. The app fetches metadata and auto-categorizes it
3. Browse your list, filter by category, mark items as read
