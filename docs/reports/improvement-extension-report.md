# FitTrack PWA — Improvement & Extension Report

**Date**: 2026-04-02
**Version**: 0.2.1
**Branch**: development

Based on deep codebase analysis, competitor research (Strong, Hevy, JEFIT, FitNotes, Fitbod, Hardy), and a gap analysis of documented vs. implemented features.

---

## 1. Missing Documented Features (Quick Fixes)

These are already defined in the data model but not yet exposed in the UI:

- [ ] **RIR (Reps in Reserve) input** — `ExerciseSet.rir` field exists, always `null`. Needs UI in `SetRow`. *(Low)*
- [x] **Workout notes editing** — `WorkoutSession.notes` exists, now editable during active workout. *(Low)*
- [ ] **Per-exercise elapsed time** — `ExerciseSession.startedAt/completedAt` stored but not shown. Add timer display to `ExerciseCard`. *(Low)*

---

## 2. High-Value New Features

### 2.1 Progression & Training Intelligence

- [x] **Estimated 1RM tracking + chart** — Epley/Brzycki formula, line chart per exercise over time. The #1 most-requested chart among serious lifters. *(Medium | Very High)*
- [ ] **RPE/RIR logging** — Optional 1–10 RPE or 0–5 RIR per set. Enables autoregulation — adjust load based on daily readiness rather than fixed progression. *(Low | High)*
- [ ] **Auto-deload recommendation** — After 3+ stagnation sessions or N weeks without deload, suggest a deload week (reduce volume 50% or intensity to 60–80%). *(Medium | High)*
- [ ] **Weekly volume per muscle group** — Stacked bar or radar chart showing sets/week per muscle group. Helps detect imbalances and track volume landmarks (MEV/MAV/MRV). *(Medium | High)*
- [ ] **Percentage-based programming** — Suggest weights as % of estimated 1RM. Useful for periodized programs. *(Medium | Medium)*

### 2.2 Workout Experience

- [x] **Auto-fill from last session** — Weight/reps are pre-populated from the latest completed session for the same exercise across all templates, and the previous values are also shown inline for comparison. *(Implemented)*
- [ ] **Stepper controls (+/-)** — Increment/decrement buttons alongside weight/rep inputs. Faster than typing, especially mid-set with sweaty hands. *(Low | High)*
- [ ] **Quick-duplicate set** — "Copy last set" button to instantly add a set with same weight/reps. *(Low | High)*
- [ ] **Superset / dropset logging** — Group exercises together as supersets, log dropsets within a single set row. Common in intermediate+ programs. *(Medium | High)*
- [ ] **Warm-up set generator** — Auto-suggest 2–3 ramp-up sets before working weight (e.g., 50% x 5, 70% x 3, 85% x 1). *(Low | Medium)*
- [ ] **Reorder exercises mid-workout** — Drag-and-drop to adjust exercise order on the fly (gym equipment availability). *(Medium | Medium)*
- [ ] **Swipe-to-complete gesture** — Swipe a set row to mark complete instead of tapping the circle. *(Medium | Medium)*

### 2.3 Motivation & Gamification

All of these work fully offline — no backend needed.

- [x] **Workout streak tracker** — Current streak + longest streak on dashboard. Consecutive weeks with N+ workouts. *(Low | High)*
- [x] **PR celebration animation** — Toast/confetti when a new personal record is detected (weight PR, rep PR, volume PR, e1RM PR). *(Low | High)*
- [x] **Achievement/badge system** — 10–15 locally-computed badges: first workout, 100 workouts, all muscle groups in a week, tonnage milestones, etc. *(Medium | High)*
- [x] **Streak-at-risk warning** — "Trainiere heute, um deine 12-Wochen-Serie zu halten!" on dashboard. *(Low | Medium)*
- [x] **Progress summary card** — "Dein Bankdruecken e1RM hat sich in 3 Monaten um 15% verbessert" — periodic insight cards. *(Medium | Medium)*

### 2.4 Data & Visualization

- [x] **e1RM progression chart** — Line chart showing estimated 1RM over time per exercise. Single most wanted chart. *(Medium | Very High)*
- [ ] **Rep max progression** — Overlay 1RM, 3RM, 5RM, 10RM lines on same chart per exercise. *(Medium | High)*
- [ ] **Training frequency heatmap** — Enhance existing calendar with intensity coloring (GitHub contribution style). *(Low | Medium)*
- [ ] **Workout duration trend** — Chart showing session duration over time. *(Low | Medium)*
- [ ] **Filterable analytics** — Filter statistics by exercise, muscle group, or date range. *(Medium | High)*
- [ ] **Period comparison** — Compare this month vs. last month side by side. *(Medium | Medium)*

### 2.5 Data Portability

- [ ] **Import from Strong CSV** — Strong is the market leader — importing its CSV format is a major user acquisition path. *(Medium | High)*
- [ ] **Import from Hevy CSV** — Second most popular app to migrate from. *(Medium | Medium)*

---

## 3. Code Quality & Architecture Improvements

### 3.1 Error Handling & Resilience

- [x] Add try-catch to `onMount` async calls (`+page.svelte` in dashboard, history, settings, templates) — silent failures lead to blank screens.
- [x] Create reusable `ErrorBoundary.svelte` wrapping async data loading.
- [x] Add error states to all data-loading pages.

### 3.2 UX Polish

- [x] Add `animate-pulse` loading skeletons to dashboard, history, stats.
- [x] Create reusable `EmptyState.svelte` for exercises, history, dashboard.
- [x] Add `ConfirmDialog` to template delete and remove-exercise-from-workout.
- [x] Add Svelte transitions to set completion, modal open/close, tab switching.

### 3.3 Architecture Violations

- [x] Fix `ExercisePickerModal.svelte` importing directly from `exercise-repository` — should go through `application/exercises/queries`.
- [x] Extract magic numbers (default 3 sets, 8–12 reps, 90s rest, 3-session stagnation threshold) to a `constants.ts`.

### 3.4 Performance

- [x] Optimize `loadAllData()` in statistics — fetches ALL sessions/sets on every period change. Use indexed Dexie queries with date filters.
- [x] Lazy-load Chart.js — currently loads upfront. Dynamically import only when statistics tab opens.
- [x] Memoize `buildSetsMap()` — called multiple times with same data.

### 3.5 Testing

- [x] Set up test infrastructure (`vitest` + `@testing-library/svelte`).
- [x] Add tests for `progression.ts` (domain logic).
- [x] Add tests for statistics queries (date calculations).
- [x] Add tests for plate calculator.

### 3.6 Accessibility

- [x] Add ARIA labels to interactive elements (modals, switches).
- [x] Fix `a11y_click_events_have_key_events` suppressed in `ExercisePickerModal`.
- [x] Add `prefers-reduced-motion` support.
- [x] Audit touch targets for 48px minimum (gym use with sweaty hands).
- [x] Respect system font size.

### 3.7 PWA Quality

- [x] Change `skipWaiting: true` to `false` in service worker config — could break active users mid-workout.
- [x] Add "Add to Home Screen" install prompt.
- [x] Add maskable icon and 180px Apple touch icon.
- [x] Add offline status indicator in the UI.

---

## 4. Prioritized Roadmap

### Phase 1 — Quick Wins (1–2 days each)

- [x] Auto-fill weight/reps from last session
- [ ] RIR optional input field
- [x] Workout notes editing
- [x] PR detection + celebration toast
- [x] Workout streak on dashboard
- [ ] Stepper +/- controls for weight/reps
- [ ] Quick-duplicate last set button
- [ ] Per-exercise elapsed time display
- [x] Loading skeletons + empty states
- [x] Error handling in async operations

### Phase 2 — High-Impact Features (3–5 days each)

- [x] Estimated 1RM calculation + line chart per exercise
- [ ] Weekly volume per muscle group chart
- [x] Achievement/badge system
- [ ] Auto-deload recommendation
- [ ] Filterable analytics dashboard
- [ ] Import from Strong CSV
- [ ] Superset/dropset logging

### Phase 3 — Polish & Infrastructure

- [x] Add vitest + test the domain layer
- [x] Lazy-load Chart.js
- [x] Optimize statistics queries with date-indexed Dexie queries
- [x] Accessibility audit (ARIA, touch targets, reduced motion)
- [x] PWA install prompt + offline indicator
- [x] Fix service worker `skipWaiting` behavior

---

## 5. Competitor Feature Matrix

| Feature | FitTrack | Strong | Hevy | JEFIT | Fitbod |
|---|---|---|---|---|---|
| Workout templates | Yes | Yes | Yes | Yes | Auto-generated |
| Double progression | Yes | No | No | No | No |
| Rest timers | Yes | Yes | Yes | Yes | Yes |
| Live comparison | Yes | Yes | Yes | No | No |
| e1RM tracking | No | Yes | Yes | No | Yes |
| RPE/RIR logging | No | No | Yes | No | No |
| Supersets | No | Yes | Yes | Yes | Yes |
| Achievements | Yes | No | Yes | Yes | No |
| Streaks | Yes | No | Yes | No | No |
| Import from other apps | No | No | Yes | No | No |
| Plate calculator | Yes | Yes | No | No | No |
| Offline-first | Yes | Partial | No | No | No |
| No subscription required | Yes | No | No | No | No |

---

## Sources

- JEFIT: 10 Best Workout Tracker Apps in 2026
- Setgraph: Best Free Workout Apps 2025
- Stronger: Best Workout Tracker Apps in 2026
- FindYourEdge: Best Strength Training Apps 2026
- Hardy App: Advanced Training Programming
- RP Hypertrophy App Review
- Hevy: Progressive Overload Guide
- Zfort: Fitness App UX/UI Best Practices
- Stormotion: Fitness App UI Design Principles
- Fitbod: Real-Time Metrics and Strength Scores
- Yu-kai Chou: Top 10 Gamification in Fitness 2026
- FYC Labs: Accessibility in Fitness Apps
- Wikipedia: One-Repetition Maximum Formulas
- Hevy: How Many Sets Per Muscle Group
