# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitTrack PWA is a mobile-first, offline-first Progressive Web App for workout tracking. It replicates an existing iOS app with full feature parity. **No backend** — all data lives in IndexedDB. All UI text is in **German** (hardcoded, no i18n framework).

## Tech Stack

- **SvelteKit** with static adapter (no SSR) — all routes are client-side
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for state management — no external state library
- **Dexie.js** for IndexedDB (typed wrapper with live queries and schema migrations)
- **Tailwind CSS** for styling (mobile-first, 375–430px viewport)
- **vite-plugin-pwa** for service worker and offline caching
- **TypeScript** throughout
- **pnpm** as package manager

## Commands

```bash
pnpm install              # Install dependencies
pnpm run dev              # Dev server at localhost:5173
pnpm run build            # Static build to /build
pnpm run preview          # Preview production build
pnpm run check            # Type check (svelte-kit sync + svelte-check)
```

## Architecture

### Data Model

Six IndexedDB tables via Dexie: `exercises`, `workoutTemplates`, `templateExercises`, `workoutSessions`, `exerciseSessions`, `exerciseSets`. All IDs are UUIDs (`crypto.randomUUID()`).

**Snapshot pattern**: When creating a WorkoutSession, template data (exercise name, muscle group, sets, rep range, rest duration) is copied into ExerciseSession fields. This preserves historical accuracy when templates are later edited.

**Cascade deletes** must be implemented manually — Dexie has no native support.

**MuscleGroup** enum values are German lowercase: `'ruecken' | 'beine' | 'brust' | 'arme' | 'schulter'`.

### Key Business Logic

- **Progression engine** (Double Progression): If all completed sets for an exercise hit `repRangeUpper`, recommend +1.0 kg. If weight and max reps unchanged for 3+ consecutive sessions, flag stagnation. Progression comparison is **per-exercise across all templates**, not per-template.
- **Live comparison**: Always per-exercise (not per-template). Compare current session against the most recent completed ExerciseSession with the same `exerciseId`.
- **Rest timers**: Date-based (`endDate = Date.now() + duration`), per-exercise, concurrent. Recalculate on `visibilitychange` for background resilience.

### Routing

SvelteKit file-based routing: `/` (home/dashboard), `/workout/[id]`, `/history`, `/history/[id]`, `/templates`, `/templates/new`, `/templates/[id]`, `/templates/[id]/edit`, `/exercises`, `/settings`.

### Number Formatting

German locale: comma for decimal separator ("62,5 kg"), period for thousands ("1.250 kg"), German date format ("15. Marz 2026, 10:30").

## Key Design Decisions

- Screen wake lock during active workouts (`navigator.wakeLock`)
- Haptic feedback on set completion (`navigator.vibrate(10)`, Android only)
- Dark mode via `prefers-color-scheme`
- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- No third-party UI component library — inline SVG icons
- CSV export uses semicolons with German headers
- Backup/restore: full DB dump as versioned JSON file

## Reference

- `PWA_SPEC.md` — Full specification with data model, features, and UI design
- `TrainingPlan.md` — The actual workout plan (seed data source)
