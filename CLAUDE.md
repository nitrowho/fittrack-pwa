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

### Development Rules

Follow these architecture rules for all new code and when touching existing code:

- Use layered dependencies: `routes/components -> stores or feature controllers -> application commands/queries -> repositories -> db`.
- Do not import Dexie or `db` directly in `src/routes/**` or `src/lib/components/**`.
- Do not add new direct Dexie access in `src/lib/stores/**`; stores manage reactive UI state and call dedicated methods.
- Keep business logic pure where possible. Progression, validation, volume, and similar rules should not read IndexedDB or browser APIs directly.
- Multi-table writes, snapshot creation, and cascade deletes must live in application/repository code and use explicit transactions.
- Prefer feature-level methods such as `getDashboardData()`, `saveTemplate()`, or `startWorkout()` over table-level access.
- Keep all user-visible text in German and use shared formatter helpers for dates, weights, and volume.
- After every implementation, check whether any documentation needs to be updated. Update the affected docs whenever behavior, architecture, data model, commands, routes, or user workflows have changed.
- Migrate incrementally. Do not do a big-bang rewrite, but do not introduce new code that bypasses these boundaries.

### Git Commits

- Commit messages must start with a short category prefix followed by a colon.
- Prefer concise prefixes such as `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, or `style:`.
- Example: `docs: add architecture development rules`

## Key Design Decisions

- Screen wake lock during active workouts (`navigator.wakeLock`)
- Haptic feedback on set completion (`navigator.vibrate(10)`, Android only)
- Dark mode via `prefers-color-scheme`
- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- No third-party UI component library — inline SVG icons
- CSV export uses semicolons with German headers
- Backup/restore: full DB dump as versioned JSON file

## On-Demand Context

Read these reference docs when working in the relevant area:

| When working on... | Read |
| --- | --- |
| Frontend/UI work | `docs/ui-design.md` |
| Data model changes | `docs/data-model.md` |
| New features | `docs/features.md` |

## Reference

- `docs/overview.md` — Project overview, tech stack, and summary
- `docs/data-model.md` — Data model (entities, schema, indexes, cascades, snapshots)
- `docs/architecture.md` — Project structure, state management, routing, offline strategy
- `docs/features.md` — All features (dashboard, workout, timers, progression, history, etc.)
- `docs/ui-design.md` — UI layout, visual design, interactions, accessibility
- `docs/pwa-config.md` — PWA manifest, service worker, hosting
- `docs/localization.md` — German translations and number formatting
- `docs/seed-data.md` — First-launch seed exercises and templates
- `docs/migration.md` — iOS migration path and development/deployment
- `docs/TrainingPlan.md` — The actual workout plan (seed data source)
- `docs/development-rules.md` — Coding guidelines, architecture layers, dependency rules, and migration direction
