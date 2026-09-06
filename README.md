# Heuristiq

A DSA prep companion: 10 question sheets, company trackers, contest calendars, notes, an in-app code runner, algorithm visualiser and whiteboard.

## Repository layout

```
frontend/   the Vite + React app (all UI, runs fully client-side)
backend/    Firebase configuration + the data pipeline
  firestore.rules    Firestore security rules (deploy with firebase CLI)
  scripts/           sheet scrapers that generate frontend/src/data/**
```

The app has no server code of its own - Firebase (Auth + Firestore) is the backend. The scrapers run on demand to refresh question data.

## Features

- **Auth** - email/password, Google OAuth and guest mode (Firebase Auth). Signed-in users sync to Firestore; guests work locally.
- **Offline-first caching** - every document (progress, notes, code drafts, whiteboards) is written to `localStorage` first, then debounce-synced to Firestore. Losing connectivity never loses work.
- **Dashboard** - DSA progress analytics, weekly question chart, consistency calendar, daily notes and todos.
- **DSA Sheet** - the full Striver A2Z sheet (455+ problems) with status/revision filters, plus a solve-in-app editor (Monaco) that runs code.
- **Material** - Striver roadmaps (A2Z, SDE, CP, SQL), Blind 75 / NeetCode 150, curated links, problem-solving patterns and complexity tables.
- **Code Playground** - standalone scratch editor for C++, Java, Python, JavaScript and C, with stdin support.
- **Visualizer** - step-through animations for sorting (bubble/selection/insertion/merge/quick), searching (linear/binary) and grid pathfinding (BFS/DFS).
- **Notes** - searchable, taggable, synced notes.
- **Whiteboard** - Excalidraw canvas with multiple boards, autosaved. Available as a tab and from the floating button on any tab.
- Error boundaries, hash-based routing (refresh/share keeps the active tab), dark/light theme, mobile-first layout.

## Setup

```bash
cd frontend
npm install
npm run dev
```

To refresh the question data (sheets, companies):

```bash
node backend/scripts/scrapeCompanies.mjs
node backend/scripts/scrapeMikSheet.mjs
node backend/scripts/scrapeSheets.mjs
node backend/scripts/scrapeMoreSheets.mjs
```

Get the config values from Firebase console → Project settings → Your apps → SDK setup and configuration. Enable **Authentication** (Email/Password and Google providers) and **Firestore**.

These values are public client identifiers - access is controlled by security rules, not by hiding them. See [Firebase docs](https://firebase.google.com/docs/projects/api-keys).

## Deploying the security rules

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Rules (`firestore.rules`) restrict every document to its owner's uid.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (code-split) |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run check` | Algorithm visualizer + code runner live self-tests |

## Storage layout

| Data | Guest | Signed in |
|---|---|---|
| Progress | `localStorage` | `users/{uid}/data/progress` |
| Notes | `localStorage` | `users/{uid}/data/notes` |
| Code drafts | `localStorage` | `users/{uid}/data/code` |
| Whiteboards | `localStorage` | `users/{uid}/data/boards` |

Whiteboard scenes are stored as JSON strings because Excalidraw element `points` are nested arrays, which Firestore rejects. Documents over ~900 kB skip cloud sync (Firestore's hard limit is 1 MiB) but keep saving locally.

## Notes on the code runner

Code execution uses the free [Wandbox](https://wandbox.org/) API (no key, CORS-enabled). Infinite loops are killed by their watchdog after ~30 seconds. For Java, the public class must be named `prog` - Wandbox compiles the source as `prog.java` (same model as LeetCode's fixed `Solution` class); the Java template already does this. If you need guaranteed capacity, self-host Wandbox and change `WANDBOX_URL` in `src/lib/runner.js`. Monaco loads from a CDN by default (`@monaco-editor/react`), so the editor tab needs network access.
