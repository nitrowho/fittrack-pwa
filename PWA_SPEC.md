# FitTrack PWA — Specification & Architecture

## 1. Overview

FitTrack PWA is a mobile-first Progressive Web App that replicates the full functionality of the existing FitTrack iOS app. It runs entirely in the browser, stores all data locally in IndexedDB, and can be installed on the home screen for a native-like experience — with no signing, no expiry, and no app store.

### Goals

- **Feature parity** with the iOS app (workout tracking, rest timers, progression engine, live comparison, data export)
- **Offline-first** — works without internet, all data local
- **Installable** — "Add to Home Screen" on iOS/Android for native feel
- **Manual backup/restore** — JSON file export/import to prevent data loss
- **No backend** — fully client-side, zero infrastructure

### Non-Goals (for now)

- Cloud sync / multi-device sync
- Push notifications (limited iOS PWA support)
- User accounts / authentication

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | SvelteKit (static adapter) | Minimal boilerplate, small bundle, reactive model similar to SwiftUI's `@Observable` |
| **Build** | Vite | Fast dev server, HMR, native ESM |
| **PWA** | vite-plugin-pwa | Service worker generation, web manifest, offline caching |
| **Storage** | Dexie.js (IndexedDB) | Typed IndexedDB wrapper with live queries, versioned schema migrations |
| **Styling** | Tailwind CSS | Utility-first, mobile-first responsive design |
| **Language** | TypeScript | Type safety across models and business logic |
| **Notifications** | Web Notifications API | Rest timer completion alerts (where supported) |
| **Export** | Native `Blob` + `URL.createObjectURL` | CSV/JSON file generation and download |
| **Haptics** | `navigator.vibrate()` | Set completion feedback (Android only; no-op on iOS) |

### No Dependencies On

- Any backend / API server
- Any database server
- Any authentication provider
- Any third-party UI component library

---

## 3. Data Model

All models map directly from the iOS SwiftData schema. IDs are UUIDs (generated client-side via `crypto.randomUUID()`). All fields have defaults for forward compatibility.

### 3.1 Entity Relationship Diagram

```
Exercise ←──── TemplateExercise ────→ WorkoutTemplate
                                          │
                                          ↓ (snapshot at session creation)
                                    WorkoutSession
                                          │
                                    ExerciseSession
                                          │
                                      ExerciseSet
```

### 3.2 Dexie Schema

```typescript
// db.ts
import Dexie, { type Table } from 'dexie';

interface Exercise {
  id: string;           // UUID
  name: string;
  muscleGroup: MuscleGroup | null;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

interface TemplateExercise {
  id: string;
  templateId: string;   // FK → WorkoutTemplate
  exerciseId: string;    // FK → Exercise
  sortOrder: number;
  targetSets: number;    // e.g. 3
  repRangeLower: number; // e.g. 6
  repRangeUpper: number; // e.g. 10
  restDurationSeconds: number; // e.g. 180
}

interface WorkoutSession {
  id: string;
  templateId: string;    // FK → WorkoutTemplate
  templateName: string;  // Snapshot at creation
  startedAt: Date;
  completedAt: Date | null;
  notes: string;
}

interface ExerciseSession {
  id: string;
  workoutSessionId: string; // FK → WorkoutSession
  exerciseId: string;       // Reference to Exercise (not FK)
  exerciseName: string;     // Snapshot
  muscleGroup: MuscleGroup | null; // Snapshot
  sortOrder: number;
  startedAt: Date | null;
  completedAt: Date | null;
  targetSets: number;       // Snapshot from TemplateExercise
  repRangeLower: number;    // Snapshot
  repRangeUpper: number;    // Snapshot
  restDurationSeconds: number; // Snapshot
}

interface ExerciseSet {
  id: string;
  exerciseSessionId: string; // FK → ExerciseSession
  setNumber: number;         // 1-based
  weight: number;            // kg
  reps: number;
  rir: number | null;        // Reps In Reserve
  isCompleted: boolean;
  completedAt: Date | null;
}

type MuscleGroup = 'ruecken' | 'beine' | 'brust' | 'arme' | 'schulter';
```

### 3.3 Dexie Indexes

```typescript
class FitTrackDB extends Dexie {
  exercises!: Table<Exercise>;
  workoutTemplates!: Table<WorkoutTemplate>;
  templateExercises!: Table<TemplateExercise>;
  workoutSessions!: Table<WorkoutSession>;
  exerciseSessions!: Table<ExerciseSession>;
  exerciseSets!: Table<ExerciseSet>;

  constructor() {
    super('fittrack');
    this.version(1).stores({
      exercises: 'id, name, muscleGroup',
      workoutTemplates: 'id, sortOrder',
      templateExercises: 'id, templateId, exerciseId, sortOrder',
      workoutSessions: 'id, templateId, startedAt, completedAt',
      exerciseSessions: 'id, workoutSessionId, exerciseId, sortOrder',
      exerciseSets: 'id, exerciseSessionId, setNumber',
    });
  }
}
```

### 3.4 Cascade Deletes

Dexie doesn't support cascade deletes natively. Implement them as helper functions:

- **Delete WorkoutTemplate** → delete all TemplateExercises with that `templateId`
- **Delete WorkoutSession** → delete all ExerciseSessions → delete all ExerciseSets
- **Delete Exercise** → delete all TemplateExercises referencing it

### 3.5 Snapshot Pattern

When creating a WorkoutSession, snapshot all relevant template data into ExerciseSession fields. This ensures historical accuracy even if templates are edited later. The ExerciseSession stores `exerciseName`, `muscleGroup`, `targetSets`, `repRangeLower`, `repRangeUpper`, and `restDurationSeconds` — all copied from the TemplateExercise at session creation time.

---

## 4. Architecture

### 4.1 Project Structure

```
fittrack-pwa/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── database.ts          # Dexie DB instance & schema
│   │   │   ├── seed.ts              # First-launch seed data
│   │   │   └── backup.ts            # Export/import JSON backup
│   │   ├── models/
│   │   │   └── types.ts             # TypeScript interfaces & enums
│   │   ├── stores/
│   │   │   ├── workout.svelte.ts    # Active workout state (runes)
│   │   │   └── timer.svelte.ts      # Rest timer & session timer state
│   │   ├── services/
│   │   │   ├── progression.ts       # Double Progression engine
│   │   │   ├── export.ts            # CSV/JSON data export
│   │   │   └── formatter.ts         # German locale formatters
│   │   └── components/
│   │       ├── ExerciseCard.svelte
│   │       ├── SetRow.svelte
│   │       ├── RestTimer.svelte
│   │       ├── MuscleGroupBadge.svelte
│   │       ├── BottomNav.svelte
│   │       └── ConfirmDialog.svelte
│   ├── routes/
│   │   ├── +layout.svelte           # Shell layout with bottom nav
│   │   ├── +page.svelte             # Home / Dashboard
│   │   ├── workout/
│   │   │   └── [id]/+page.svelte    # Active workout view
│   │   ├── history/
│   │   │   ├── +page.svelte         # Session history list
│   │   │   └── [id]/+page.svelte    # Session detail view
│   │   ├── templates/
│   │   │   ├── +page.svelte         # Template list
│   │   │   ├── new/+page.svelte     # Create template
│   │   │   └── [id]/
│   │   │       ├── +page.svelte     # Template detail (read-only)
│   │   │       └── edit/+page.svelte # Edit template
│   │   ├── exercises/
│   │   │   └── +page.svelte         # Exercise catalog
│   │   └── settings/
│   │       └── +page.svelte         # Backup/restore, export, about
│   └── app.html                     # HTML shell
├── static/
│   ├── manifest.webmanifest         # PWA manifest
│   ├── icons/                       # App icons (192, 512)
│   └── favicon.ico
├── svelte.config.js                 # SvelteKit config (static adapter)
├── tailwind.config.js
├── vite.config.ts                   # PWA plugin config
├── tsconfig.json
└── package.json
```

### 4.2 State Management

Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`) for reactive state — no external state management library needed.

#### Workout Store (`workout.svelte.ts`)

Manages the active workout session. Created when a workout starts, destroyed when it ends.

```
Responsibilities:
- Hold current WorkoutSession + ExerciseSessions + ExerciseSets in memory
- Complete/uncomplete sets
- Auto-populate from last session
- Compute volume, volume deltas, elapsed time
- Apply progression recommendations
- Coordinate with timer store
- Persist changes to Dexie on each mutation
```

#### Timer Store (`timer.svelte.ts`)

Manages date-based rest timers and session elapsed time.

```
Responsibilities:
- Per-exercise rest timers (concurrent, date-based)
- Session elapsed time
- 1 Hz tick via setInterval (requestAnimationFrame not needed — 1s precision is fine)
- Recalculate on page visibility change (visibilitychange event)
- Web Notification on timer completion (where permitted)
```

### 4.3 Routing

SvelteKit file-based routing. All routes are client-side (static adapter, no SSR).

| Route | View | Purpose |
|-------|------|---------|
| `/` | Home | Dashboard, quick-start, recent sessions |
| `/workout/[id]` | ActiveWorkout | Live workout tracking |
| `/history` | HistoryList | All completed sessions |
| `/history/[id]` | SessionDetail | Detailed session view |
| `/templates` | TemplateList | Browse/manage templates |
| `/templates/new` | CreateTemplate | Create new template |
| `/templates/[id]` | TemplateDetail | View template (read-only) |
| `/templates/[id]/edit` | EditTemplate | Edit template |
| `/exercises` | ExerciseList | Exercise catalog |
| `/settings` | Settings | Backup/restore, data export |

### 4.4 Offline Strategy

**Precache** all app assets (HTML, JS, CSS, icons) via the service worker generated by `vite-plugin-pwa`. The app shell loads instantly from cache.

**Data** lives entirely in IndexedDB — never fetched from a server. The service worker only handles asset caching.

**Visibility change handling**: When `document.visibilityState` changes to `'visible'`, recalculate all timer values from stored dates (equivalent to iOS `scenePhase == .active`).

---

## 5. Features

### 5.1 Home / Dashboard

- **In-progress recovery**: If a WorkoutSession exists without `completedAt`, show a "Fortsetzen" (Resume) card linking to `/workout/[id]`
- **Quick start**: Show all templates with exercise summaries. Suggest next template based on alternating A/B pattern (query last completed session's `templateId`)
- **Recent sessions**: Last 3 completed sessions with date, duration, total volume

### 5.2 Active Workout

- **Session header**: Elapsed time (live), total volume (live)
- **Exercise cards**: One per exercise, expandable/collapsible
  - Set count progress (e.g., "2/3")
  - Per-exercise elapsed time
  - Progression recommendation banner (clickable for weight increase)
  - Last session comparison ("Letztes Mal: 60 kg — 10/9/8")
  - Volume delta vs. last session
  - Set rows with inline weight/reps input
  - Rest timer (inline, circular progress, skip button)
  - Add/remove set buttons
- **Screen wake lock**: Use `navigator.wakeLock.request('screen')` to prevent screen dimming during workout (release on finish/cancel)
- **Finish**: Confirmation dialog showing duration, volume, sets completed
- **Cancel**: Confirmation dialog, deletes session from database

### 5.3 Set Logging

- Weight input: Number input with `step="0.5"` and `inputmode="decimal"`
- Reps input: Number input with `inputmode="numeric"`
- Complete/uncomplete toggle (circle → checkmark)
- Completed sets get visual distinction (green background, disabled inputs)
- Auto-populate: Changing weight/reps on one incomplete set updates all other incomplete sets in the same exercise
- Last session comparison per set: "Vorher: 60 kg × 10"

### 5.4 Rest Timer

- **Date-based**: Store `endDate = Date.now() + restDurationSeconds * 1000`, compute remaining from `endDate - Date.now()`
- **Per-exercise**: Multiple timers can run concurrently
- **Display**: Circular progress arc + "M:SS" countdown
- **Skip**: Dismiss timer early
- **Notification**: Fire a Web Notification when timer reaches 0 (request permission on first use)
- **Background resilience**: On `visibilitychange → visible`, recalculate remaining from stored `endDate`

### 5.5 Progression Engine

Identical logic to iOS:

- **Weight increase**: If all completed sets in the latest ExerciseSession (by `exerciseId`, across all templates) hit `repRangeUpper` → recommend `currentWeight + 1.0 kg`
- **Stagnation**: If weight and max reps unchanged for 3+ consecutive ExerciseSessions (by `exerciseId`, across all templates) → flag as stalled
- **UI**: Green banner for weight increase (tappable → apply to uncompleted sets), orange banner for stagnation (informational)

### 5.6 Live Comparison

Comparison is always **per-exercise**, not per-template. When doing Workout A containing Bankdrücken, the comparison is with the last completed ExerciseSession for Bankdrücken — regardless of whether that was in Workout A or Workout B.

- **Query**: Find the most recent completed ExerciseSession with the same `exerciseId`, excluding the current session
- **Per-exercise**: Show last reps summary and volume delta
- **Per-set**: Show "Vorher: X kg × Y" below each set row
- **Session header**: Total volume delta (sum of all per-exercise deltas)

### 5.7 History

- **List**: All completed sessions, sorted by `startedAt` descending
- **Row**: Template name, date, duration, total volume
- **Swipe to delete**: Swipe gesture or delete button
- **Detail view**: Duration, volume, duration/volume deltas vs. previous session, per-exercise breakdown with sets, progression insights, notes

### 5.8 Templates

- **List**: All templates sorted by `sortOrder`
- **Detail**: Read-only view of exercises with sets × reps and rest duration
- **Create**: Name + add exercises (picker with search, grouped by muscle group)
- **Edit**: Rename, add/remove/reorder exercises, edit per-exercise parameters (sets, rep range, rest duration)
- **Delete**: With cascade to TemplateExercises

### 5.9 Exercise Catalog

- **List**: Grouped by muscle group + "Sonstige" (Other/None)
- **Create**: Name + optional muscle group
- **Edit**: Name and muscle group
- **Delete**: With cascade to TemplateExercises

### 5.10 Data Export

- **CSV**: Semicolon-delimited, German headers, version comment line
- **JSON**: ISO8601 dates, pretty-printed, versioned (`exportVersion: 1`)
- **Download**: Generate `Blob`, create download link via `URL.createObjectURL`
- **Only completed sessions and sets** are exported

### 5.11 Backup & Restore

- **Backup**: Export entire database as a single JSON file
  - All 6 tables dumped with full data
  - Includes `backupVersion` and `exportedAt` timestamp
  - Downloaded as `fittrack-backup-YYYY-MM-DD.json`
- **Restore**: Import a backup JSON file
  - Validate `backupVersion` compatibility
  - Confirm with user ("This will replace all current data")
  - Clear all tables, then bulk-insert from backup
  - Show success/error feedback
- **UI**: Located in Settings page with clear "Backup erstellen" / "Backup wiederherstellen" buttons

#### Backup Format

```json
{
  "backupVersion": 1,
  "exportedAt": "2026-03-13T10:00:00.000Z",
  "data": {
    "exercises": [...],
    "workoutTemplates": [...],
    "templateExercises": [...],
    "workoutSessions": [...],
    "exerciseSessions": [...],
    "exerciseSets": [...]
  }
}
```

---

## 6. UI & Design

### 6.1 Layout

- **Mobile-first**: Designed for 375px–430px viewport width
- **Bottom navigation bar**: 4 tabs — Home, History, Templates, Settings
- **No desktop optimization** (usable but not a priority)
- **Safe area insets**: Respect `env(safe-area-inset-*)` for notched devices

### 6.2 Visual Design

- **Dark mode support**: Respect `prefers-color-scheme`, default to system preference
- **Color palette**:
  - Muscle groups: Blue (Rücken), Green (Beine), Red (Brust), Orange (Arme), Purple (Schulter)
  - Positive delta: Green
  - Negative delta: Red
  - Rest timer: Blue accent
  - Completed sets: Green background
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- **Icons**: Inline SVG or a minimal icon set (no icon library dependency)

### 6.3 Interactions

- **Haptic feedback**: `navigator.vibrate(10)` on set completion (Android only)
- **Swipe gestures**: For delete actions in lists (or fallback to explicit delete buttons)
- **Pull to refresh**: Not needed (all data is local and reactive)
- **Confirmation dialogs**: For destructive actions (delete session, cancel workout, restore backup)

### 6.4 Accessibility

- Semantic HTML (`<button>`, `<input>`, `<nav>`, `<main>`, `<section>`)
- ARIA labels on icon-only buttons
- Sufficient color contrast (WCAG AA)
- Focus management on route changes
- Keyboard navigable (though primarily touch-optimized)

---

## 7. PWA Configuration

### 7.1 Web Manifest

```json
{
  "name": "FitTrack",
  "short_name": "FitTrack",
  "description": "Workout Tracking",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 7.2 Service Worker

Generated by `vite-plugin-pwa` with:

- **Precache**: All built assets (HTML, JS, CSS, icons)
- **Strategy**: Cache-first for assets (app never needs network after first load)
- **Runtime caching**: None needed (no API calls)
- **Update**: Prompt user when new version is available ("App aktualisieren?")

### 7.3 Hosting

Static files only. Can be hosted on any static host:

- **Vercel** (free tier, automatic HTTPS)
- **Netlify** (free tier)
- **GitHub Pages** (free)
- **Cloudflare Pages** (free)

Requires HTTPS for PWA installation and service worker.

---

## 8. Localization

All UI text in **German**. No i18n framework needed (single language).

### Key Translations

| Context | Text |
|---------|------|
| Start workout | "Workout starten" |
| Resume workout | "Fortsetzen" |
| Finish workout | "Beenden" |
| Cancel workout | "Abbrechen" |
| Recent sessions | "Letzte Einheiten" |
| History | "Verlauf" |
| Templates | "Vorlagen" |
| Exercises | "Übungen" |
| Settings | "Einstellungen" |
| Sets × Reps | "3 × 6–10" |
| Rest duration | "3 Min" / "3:15 Min" |
| Weight | "60 kg" / "62,5 kg" |
| Volume | "1.250 kg" |
| Previous | "Vorher: 60 kg × 10" |
| Last time | "Letztes Mal" |
| Increase weight | "Gewicht erhöhen auf 62,5 kg" |
| Stalled | "Seit 3 Einheiten keine Steigerung" |
| Backup | "Backup erstellen" |
| Restore | "Backup wiederherstellen" |
| Export | "Daten exportieren" |
| No sessions yet | "Noch keine Einheiten" |
| Muscle groups | Rücken, Beine, Brust, Arme, Schulter |

### Number Formatting

- **Decimal separator**: Comma (German locale) — "62,5 kg"
- **Thousands separator**: Period — "1.250 kg"
- **Date format**: "15. März 2026, 10:30" (German medium date)

---

## 9. Seed Data

On first launch (empty database), seed:

### Exercises

| Name | Muscle Group |
|------|-------------|
| Kniebeuge | Beine |
| Bankdrücken | Brust |
| Chin-Ups | Rücken |
| Langhantelrudern Obergriff | Rücken |
| Rumänisches Kreuzheben | Beine |

### Templates

**Workout A** (sortOrder: 0):

| # | Exercise | Sets × Reps | Rest |
|---|----------|------------|------|
| 1 | Kniebeuge | 3 × 5–8 | 4:00 |
| 2 | Bankdrücken | 3 × 6–10 | 3:30 |
| 3 | Chin-Ups | 3 × 6–10 | 3:15 |
| 4 | Langhantelrudern Obergriff | 2 × 6–10 | 2:30 |

**Workout B** (sortOrder: 1):

| # | Exercise | Sets × Reps | Rest |
|---|----------|------------|------|
| 1 | Rumänisches Kreuzheben | 3 × 6–10 | 4:00 |
| 2 | Bankdrücken | 3 × 6–10 | 3:30 |
| 3 | Chin-Ups | 3 × 6–10 | 3:15 |
| 4 | Langhantelrudern Obergriff | 2 × 6–10 | 2:30 |

---

## 10. Migration Path

### From iOS App

Users can export data from the iOS app (JSON format) and import it into the PWA:

1. Export from iOS app via ExportView (JSON format)
2. In PWA Settings, use "Daten importieren" to load the exported JSON
3. Map iOS export format to PWA database schema
4. Insert records into Dexie

This requires a one-time import adapter that understands the iOS export format (`version: 1`, session-oriented structure) and transforms it into the PWA's table-oriented backup format.

### Database Versioning

Dexie supports schema migrations via `this.version(N).stores(...)`. When the schema changes:

1. Increment version number
2. Define new indexes
3. Provide upgrade function if data transformation is needed

Backup files include `backupVersion` to detect format changes during restore.

---

## 11. Development & Deployment

### Local Development

```bash
pnpm create svelte@latest fittrack-pwa  # SvelteKit skeleton
cd fittrack-pwa
pnpm install dexie tailwindcss vite-plugin-pwa
pnpm run dev                             # localhost:5173
```

### Build

```bash
pnpm run build    # Static output in /build
pnpm run preview  # Preview production build locally
```

### Deploy

Push to GitHub → auto-deploy via Vercel/Netlify/Cloudflare Pages. Zero config for static SvelteKit.

---

## 12. Summary

| Aspect | Decision |
|--------|----------|
| **Framework** | SvelteKit (static, no SSR) |
| **State** | Svelte 5 runes ($state, $derived, $effect) |
| **Storage** | Dexie.js (IndexedDB) |
| **Styling** | Tailwind CSS |
| **PWA** | vite-plugin-pwa (precache, manifest) |
| **Timers** | Date-based (endDate - now), 1 Hz setInterval |
| **Backup** | Full DB dump as JSON file (download/upload) |
| **Export** | CSV (semicolon) + JSON (ISO8601), versioned |
| **Language** | German (hardcoded, no i18n) |
| **Hosting** | Any static host (Vercel, Netlify, etc.) |
| **iOS migration** | One-time JSON import from iOS export |
