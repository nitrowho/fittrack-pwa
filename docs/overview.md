# FitTrack PWA — Overview & Tech Stack

## Overview

FitTrack PWA is a mobile-first, offline-first workout tracker built as a static SvelteKit app. It mirrors the existing iOS app's core training workflow, runs entirely in the browser, and stores all user data locally in IndexedDB.

Current product characteristics:

- No backend, no user accounts, no cloud sync
- Installable as a Progressive Web App
- German UI copy throughout the app
- Backup and export features for local data portability
- Training history, statistics, theme selection, and plate calculation already shipped

## Goals

- Track workouts fully offline
- Preserve training history via snapshot-based session data
- Keep the experience mobile-first and home-screen friendly
- Support manual backup and restore without infrastructure
- Maintain clear architectural boundaries between UI, application logic, repositories, and database code

## Current Non-Goals

- Multi-device sync
- Authentication
- Server-side rendering
- A dedicated automated test suite

## Tech Stack

| Layer | Technology | Notes |
|------|------------|------|
| Framework | SvelteKit 2 + Svelte 5 | Static SPA with runes |
| Build | Vite 7 | App version injected from `package.json` |
| Package manager | pnpm | Declared as `pnpm@10.32.1` |
| Styling | Tailwind CSS 4 | Mobile-first utility styling |
| Storage | Dexie 4 / IndexedDB | Versioned schema, local-first persistence |
| Charts | Chart.js 4 | Statistics charts and estimated 1RM chart |
| PWA | `@vite-pwa/sveltekit` | Generated manifest + service worker |
| Language | TypeScript | Used throughout the app |

## Current Project Shape

The codebase has already moved into the layered structure described in `docs/development-rules.md`:

- `src/routes` and `src/lib/components`: UI and route composition
- `src/lib/stores`: long-lived reactive workflow state
- `src/lib/application`: commands and queries per feature
- `src/lib/domain`: pure business logic such as progression and plate calculation
- `src/lib/repositories`: persistence-facing feature methods
- `src/lib/db`: Dexie schema, seed data, backup/restore
- `src/lib/infrastructure`: browser API adapters such as wake lock, downloads, haptics, and storage persistence

## Key Runtime Behavior

- The app seeds starter exercises, templates, and default plate settings on first launch.
- `WorkoutSession` and `ExerciseSession` data is snapshotted so history remains correct after templates or exercises change.
- One in-progress workout can be resumed from the dashboard.
- Settings include theme preference, plate configuration, backup/restore, CSV export, JSON export, and a storage persistence status banner.

## Development Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
pnpm run check
```

`pnpm run check` is the main validation command today. There is currently no Vitest or Playwright setup in the repository.
