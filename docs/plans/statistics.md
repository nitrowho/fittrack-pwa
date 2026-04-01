# Plan: Statistiken (Statistics)

## Problem Statement

The app collects detailed workout data (sessions, exercises, sets, weights, reps) but only surfaces basic per-session metrics. Users lack insight into their long-term progress, training consistency, and volume trends — the kind of feedback that drives motivation and informed training decisions.

## Success Criteria

- [x] History tab becomes a combined "Verlauf & Statistiken" view with a segmented control to switch between history (calendar + session list) and statistics
- [x] Statistics view shows: workouts this period, total volume, training streak, muscle group distribution, personal records, estimated 1RM, average workout duration, and a volume trend chart
- [x] Dashboard shows a compact weekly summary card (workouts count, total volume, streak)
- [x] Time period toggle (Woche / Monat / Gesamt) controls all statistics
- [x] Charts render via Chart.js (volume trend line chart, muscle group doughnut chart)
- [x] All text is German, all numbers use German locale formatting
- [x] Architecture follows layered pattern: components → queries → repositories → db
- [x] App builds and type-checks cleanly (`pnpm run check`)

## Affected Areas

### Files to create
- `src/lib/application/statistics/queries.ts` — all stats computation logic
- `src/lib/components/statistics/StatsOverview.svelte` — main statistics view
- `src/lib/components/statistics/StatCard.svelte` — reusable single-stat display card
- `src/lib/components/statistics/VolumeChart.svelte` — Chart.js line chart wrapper
- `src/lib/components/statistics/MuscleGroupChart.svelte` — Chart.js doughnut chart wrapper
- `src/lib/components/statistics/PersonalRecords.svelte` — PR list component
- `src/lib/components/DashboardStatsCard.svelte` — compact weekly stats for dashboard

### Files to modify
- `src/routes/history/+page.svelte` — add segmented control (Verlauf | Statistiken)
- `src/routes/+page.svelte` — add DashboardStatsCard between logo and "Workout starten"
- `src/lib/components/BottomNav.svelte` — update icon/label for history tab (optional: chart icon)
- `src/lib/services/formatter.ts` — add `formatCompactVolume()` for abbreviated volumes (e.g., "12.450 kg" → "12,5k")
- `package.json` — add `chart.js` dependency

### Data model changes
- None. All statistics are derived from existing tables (workoutSessions, exerciseSessions, exerciseSets).

## Design Decisions

### Chart Library: Chart.js
- Mature, well-documented, small enough (~60 KB gzipped for tree-shaken build)
- Use directly via `<canvas>` + `Chart` constructor — no Svelte wrapper library needed (better Svelte 5 compatibility)
- Register only needed components (LineController, DoughnutController, etc.) for tree-shaking

### History Tab Merge
- Segmented control at the top: **Verlauf** | **Statistiken**
- Default view remains Verlauf (calendar + list) — no behavior change for existing users
- Stats view replaces the content area below the segmented control
- Edit mode only available in Verlauf view

### Dashboard Card
- Compact horizontal card with 3 stats: Einheiten (workout count this week), Volumen (total volume this week), Serie (current streak in days/weeks)
- Tapping the card navigates to the full statistics view
- Only shown when at least 1 completed session exists

### Statistics Computations
All computations happen in `queries.ts` — pure functions that take arrays of sessions/sets and return aggregated results. The query layer fetches data from repositories and passes it to these functions.

**Estimated 1RM formula (Epley):** `1RM = weight × (1 + reps / 30)` — only computed for completed sets with reps ≤ 12 (higher reps are unreliable for 1RM estimation).

**Training streak:** Count consecutive weeks (not days) with at least 1 completed session, going backwards from the current week. A week without training breaks the streak.

**Personal records:** Heaviest completed weight per exercise (across all sessions).

## Tasks

### Phase 1: Statistics Query Layer
- [x] Install `chart.js` — `pnpm add chart.js`
- [x] Create `src/lib/application/statistics/queries.ts` with:
  - `getStatisticsData(period: 'week' | 'month' | 'all')` — main entry point returning all stats
  - `getDashboardStats()` — lightweight version returning only weekly summary (3 numbers)
  - Internal helpers: `calculateTotalVolume()`, `calculateMuscleGroupDistribution()`, `calculatePersonalRecords()`, `calculateEstimated1RM()`, `calculateTrainingStreak()`, `calculateVolumeTrend()`, `calculateAverageDuration()`
- [x] Add `formatCompactVolume()` to `src/lib/services/formatter.ts`

### Phase 2: Dashboard Stats Card
- [x] Create `src/lib/components/DashboardStatsCard.svelte` — compact 3-stat horizontal card
- [x] Integrate into `src/routes/+page.svelte` — between logo and "Workout starten", call `getDashboardStats()` on mount
- [x] Update `src/lib/application/dashboard/queries.ts` to include dashboard stats in `getDashboardData()` return type

### Phase 3: Statistics View Components
- [x] Create `src/lib/components/statistics/StatCard.svelte` — reusable card showing label, value, optional delta/trend indicator
- [x] Create `src/lib/components/statistics/VolumeChart.svelte` — Chart.js line chart (volume per week/day depending on period)
- [x] Create `src/lib/components/statistics/MuscleGroupChart.svelte` — Chart.js doughnut chart with muscle group colors from `MUSCLE_GROUP_COLORS`
- [x] Create `src/lib/components/statistics/PersonalRecords.svelte` — list of exercises with best weight and estimated 1RM
- [x] Create `src/lib/components/statistics/StatsOverview.svelte` — composes all stat components, includes time period toggle

### Phase 4: History Page Integration
- [x] Add segmented control (Verlauf | Statistiken) to `src/routes/history/+page.svelte`
- [x] Conditionally render existing history content or StatsOverview based on active segment
- [x] Ensure calendar/edit mode only shows in Verlauf segment
- [x] Optionally update BottomNav icon to reflect dual purpose (e.g., combined chart+clock icon)

## Detailed Component Specs

### Segmented Control (History Page)
```
[  Verlauf  |  Statistiken  ]
```
- Pill-shaped toggle, same style as iOS segmented controls
- Blue background on active segment, gray on inactive
- Persists selection while on the page (resets to Verlauf on navigation away)

### Time Period Toggle (Statistics View)
```
[  Woche  |  Monat  |  Gesamt  ]
```
- Same segmented control style, smaller
- Defaults to "Woche"
- Changing period recomputes all stats

### Stats Overview Layout (top to bottom)
1. Time period toggle
2. Summary stat cards row (3 cards): Einheiten, Volumen, ∅ Dauer
3. Training streak card (full width): current streak + best streak
4. Volume trend chart (line chart, full width card)
5. Muskelgruppen chart (doughnut, full width card)
6. Persönliche Rekorde (list, full width card, expandable)

### Dashboard Stats Card Layout
```
┌─────────────────────────────────────┐
│  Diese Woche                    →   │
│  3 Einheiten  ·  12.450 kg  ·  🔥4 │
└─────────────────────────────────────┘
```
- Single compact card, tappable (navigates to statistics)
- Streak shown as number with flame/series indicator

### Volume Trend Chart
- **Week period**: 7 data points (Mon–Sun), volume per day
- **Month period**: ~4 data points (per calendar week), volume per week
- **All-time period**: Per month, volume per month
- Line chart with filled area, blue color scheme
- Y-axis: volume in kg, X-axis: time labels
- Responsive to dark mode (axis colors, grid)

### Muscle Group Doughnut Chart
- 5 segments matching `MUSCLE_GROUP_COLORS` CSS variables
- Legend below with muscle group names + percentage
- Based on volume distribution (weight × reps per muscle group)

## Validation Strategy

- **Type check**: `pnpm run check` passes
- **Build**: `pnpm run build` succeeds
- **Manual test — Dashboard**: Card shows weekly stats, tapping navigates to stats
- **Manual test — History tab**: Segmented control switches between Verlauf and Statistiken
- **Manual test — Period toggle**: Switching between Woche/Monat/Gesamt updates all stats
- **Manual test — Charts**: Volume chart and muscle group chart render correctly, respond to dark mode
- **Manual test — Empty state**: Stats view shows sensible state with 0 completed sessions
- **Manual test — Personal records**: Shows correct heaviest weight per exercise
- **Edge cases**:
  - No completed sessions → show empty/zero state with encouraging message
  - Sessions with 0 weight (bodyweight exercises) → include in rep counts but clarify volume
  - Single session → streak = 1 week, charts show single data point

## Open Questions

1. **Chart.js dark mode**: Need to configure chart colors reactively based on `prefers-color-scheme`. Will use CSS custom properties or media query listener to swap chart theme.
2. **Performance**: For users with many sessions, computing all stats on every view could be slow. Start simple (compute on mount), optimize with caching only if needed.
3. **1RM display**: Show estimated 1RM only for barbell exercises (where `isBarbell === true`)? Or for all exercises? Recommendation: show for all but barbell exercises are most meaningful.
