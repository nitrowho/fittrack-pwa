# Plan: Hantelscheiben-Rechner (Plate Calculator)

## Problem Statement

When loading a barbell during a workout, users must mentally calculate which plates to put on each side. This is error-prone, especially with fractional plates (e.g. 0.5 kg, 1.25 kg). A plate calculator removes this friction by showing the exact plate breakdown per side for the current weight, using the user's configured bar weight and available plate inventory.

## Success Criteria

- [ ] User can configure barbell weight (default 20 kg) in settings
- [ ] User can configure available plate denominations and optional quantities in settings
- [ ] Default plate set ships with standard denominations: 20, 15, 10, 5, 2.5, 1.25 kg
- [ ] User can add custom plate denominations (e.g. 0.5 kg)
- [ ] Exercises have an optional `isBarbell` flag (default: false)
- [ ] Seed exercises that use a barbell (Kniebeuge, Bankdruecken, Langhantelrudern, Rumaenisches Kreuzheben) are flagged
- [ ] During a workout, barbell exercises show a small barbell icon next to the weight input
- [ ] Tapping the icon opens a bottom sheet showing the plate breakdown per side
- [ ] Calculator warns when target weight is impossible with available plates
- [ ] Calculator warns when target weight is less than bar weight
- [ ] Bottom sheet is dismissible (tap outside, swipe down, or X button)
- [ ] All UI text is in German

## Design Decisions

### Where to store plate config

Plate configuration (bar weight + plate inventory) is **app-level settings**, not per-exercise. Store it in a new `settings` IndexedDB table as a single JSON document. This avoids adding columns to existing tables and keeps the config centralised.

### Plate calculation algorithm

Greedy algorithm: subtract bar weight, divide remaining by 2 (per side), then greedily assign largest plates first. If quantities are configured, respect them (each plate count is for the total pair, so divide by 2 for per-side availability). If the remainder is not zero after exhausting all denominations, the weight is impossible.

### Bottom sheet UX

The bottom sheet is a lightweight modal that slides up from the bottom. It shows:
- The target weight and bar weight at the top
- A simple list: "Je Seite:" (per side) followed by plate entries like "2 x 20 kg, 1 x 5 kg, 1 x 2,5 kg"
- A warning banner if the weight is impossible or below bar weight
- Styled consistently with existing cards (rounded-2xl, shadow, dark mode)

### Exercise `isBarbell` flag

Add `isBarbell: boolean` to the `Exercise` interface. This requires a Dexie schema migration (version 2). The exercise create/edit form gets a toggle for this. The snapshot in `ExerciseSession` does NOT need this flag — during a workout, we look up the live `Exercise` record to check `isBarbell`, since this is a UI display concern, not historical data.

## Affected Areas

### Files to create
- `src/lib/components/PlateCalculatorSheet.svelte` — bottom sheet component
- `src/lib/domain/plates/calculator.ts` — pure plate calculation logic
- `src/lib/application/settings/queries.ts` — read plate/bar settings
- `src/lib/repositories/settings-repository.ts` — settings CRUD

### Files to modify
- `src/lib/models/types.ts` — add `isBarbell` to `Exercise`, add `PlateConfig` and `PlateDefinition` types
- `src/lib/db/database.ts` — version 2 migration, add `settings` table
- `src/lib/db/seed.ts` — set `isBarbell: true` on barbell exercises, seed default plate config
- `src/lib/repositories/exercise-repository.ts` — include `isBarbell` in create/update
- `src/lib/application/exercises/commands.ts` — accept `isBarbell` in `SaveExerciseInput`
- `src/routes/exercises/+page.svelte` — add barbell toggle to exercise form
- `src/lib/components/SetRow.svelte` — add barbell icon button, open plate calculator
- `src/lib/components/ExerciseCard.svelte` — pass `isBarbell` down to SetRow
- `src/routes/workout/[id]/+page.svelte` — load exercise barbell flags, pass to ExerciseCard
- `src/routes/settings/+page.svelte` — add plate configuration section
- `src/lib/application/settings/commands.ts` — add save plate config command
- `src/lib/stores/workout.svelte.ts` — may need to expose exercise flags (check if needed)

### Data model changes
- New field: `Exercise.isBarbell: boolean` (default false)
- New table: `settings` with schema `key` (primary key) — stores key-value pairs
- Dexie version bump: 1 → 2

## Types

```typescript
// In src/lib/models/types.ts

export interface PlateDefinition {
  weight: number;       // e.g. 20, 15, 10, 5, 2.5, 1.25, 0.5
  quantity?: number;    // total plates available (both sides combined); undefined = unlimited
}

export interface PlateConfig {
  barWeight: number;          // default 20
  plates: PlateDefinition[];  // sorted descending by weight
}

export interface PlateResult {
  perSide: { weight: number; count: number }[];  // plates needed per side
  totalWeight: number;                            // for verification
  impossible: boolean;                            // true if can't reach target
  remainder: number;                              // leftover weight that can't be made
  belowBarWeight: boolean;                        // target < barWeight
}
```

## Tasks

### Phase 1: Data model & plate calculation (pure logic, no UI)

- [ ] **1.1** Add types — `src/lib/models/types.ts`: add `isBarbell` to `Exercise`, add `PlateDefinition`, `PlateConfig`, `PlateResult`
- [ ] **1.2** Create plate calculator — `src/lib/domain/plates/calculator.ts`: pure function `calculatePlates(targetWeight: number, config: PlateConfig): PlateResult`. Greedy algorithm, handles edge cases (weight < bar, impossible combos, zero weight)
- [ ] **1.3** DB migration — `src/lib/db/database.ts`: bump to version 2, add `settings` table (`key` as primary index), add upgrade handler to set `isBarbell = false` on all existing exercises
- [ ] **1.4** Settings repository — `src/lib/repositories/settings-repository.ts`: `getPlateConfig()`, `savePlateConfig()` using the `settings` table with key `'plateConfig'`
- [ ] **1.5** Settings queries/commands — `src/lib/application/settings/queries.ts`: `getPlateConfig()` with default fallback. Update `src/lib/application/settings/commands.ts`: add `savePlateConfig()`
- [ ] **1.6** Exercise repository — `src/lib/repositories/exercise-repository.ts`: include `isBarbell` in `ExerciseRecord`, `createExercise`, `updateExercise`
- [ ] **1.7** Exercise commands — `src/lib/application/exercises/commands.ts`: add `isBarbell` to `SaveExerciseInput`
- [ ] **1.8** Seed data — `src/lib/db/seed.ts`: set `isBarbell: true` on Kniebeuge, Bankdruecken, Langhantelrudern, Rumaenisches Kreuzheben. Seed default `PlateConfig` with barWeight=20 and plates [20, 15, 10, 5, 2.5, 1.25] (all unlimited)

### Phase 2: Settings UI

- [ ] **2.1** Plate config settings section — `src/routes/settings/+page.svelte`: add "Hantelscheiben" section with:
  - Bar weight input (number, step 0.5, default 20)
  - List of plate denominations, each with weight display and optional quantity input
  - Add custom plate button (weight input)
  - Remove plate button (per denomination)
  - Save button (persists to IndexedDB)
- [ ] **2.2** Exercise barbell toggle — `src/routes/exercises/+page.svelte`: add "Langhantel-Übung" toggle (checkbox/switch) to exercise create/edit form

### Phase 3: Plate calculator bottom sheet

- [ ] **3.1** Bottom sheet component — `src/lib/components/PlateCalculatorSheet.svelte`:
  - Slide-up modal with backdrop
  - Shows target weight, bar weight
  - Plate breakdown "Je Seite:" with formatted list
  - Warning if impossible or below bar weight
  - Close button + tap-outside-to-dismiss
  - German text, dark mode support
- [ ] **3.2** Integrate into SetRow — `src/lib/components/SetRow.svelte`:
  - Accept new prop `isBarbell: boolean` (default false)
  - When `isBarbell` and weight > 0: show small barbell SVG icon button after the "kg" label
  - On tap: open PlateCalculatorSheet with current weight
- [ ] **3.3** Wire through ExerciseCard — `src/lib/components/ExerciseCard.svelte`:
  - Accept `isBarbell` prop
  - Pass it down to each `SetRow`
- [ ] **3.4** Wire through workout page — `src/routes/workout/[id]/+page.svelte`:
  - Load exercise records (or at least their `isBarbell` flags) for the active session
  - Pass `isBarbell` to each `ExerciseCard` based on `exerciseSession.exerciseId`

### Phase 4: Polish & edge cases

- [ ] **4.1** Plate config loading in workout — ensure plate config is loaded once when the workout page mounts and passed/available to the bottom sheet (avoid repeated DB reads on every tap)
- [ ] **4.2** Handle edge cases in UI:
  - Weight is 0 or empty: don't show barbell icon
  - Weight equals bar weight: show "Keine Scheiben nötig" (no plates needed)
  - Weight is less than bar weight: show warning "Gewicht ist geringer als Stangengewicht (X kg)"
  - Impossible weight: show warning "Dieses Gewicht ist mit den verfügbaren Scheiben nicht möglich. Nächstmögliches Gewicht: X kg"
- [ ] **4.3** Type check — run `pnpm run check` and fix any type errors

## Validation Strategy

- **Type check**: `pnpm run check` must pass
- **Manual test — settings**: Go to Settings, configure bar weight and plates, save. Reload app, verify config persists.
- **Manual test — exercise flag**: Create/edit exercise, toggle barbell flag, verify it persists.
- **Manual test — workout**: Start a workout with a barbell exercise. Enter a weight. Verify barbell icon appears. Tap it. Verify correct plate breakdown in bottom sheet.
- **Edge cases to verify**:
  - Weight = 0 → no icon shown
  - Weight = bar weight → "Keine Scheiben nötig"
  - Weight < bar weight → warning message
  - Impossible weight (e.g. 21 kg with bar=20 and only 2.5 kg plates) → warning with nearest achievable weight
  - Unlimited plates vs. limited inventory → correct calculation
  - Custom plate denomination (0.5 kg) → appears in calculation
  - Dark mode → all elements styled correctly

## Open Questions

1. **Nearest achievable weight**: When the target is impossible, should the calculator suggest the nearest achievable weight (higher, lower, or both)? → Suggest both directions for maximum usefulness.
2. **Per-exercise bar weight**: For now, one global bar weight. If the user later wants per-exercise bar weights (e.g. EZ-bar), this can be added as an optional override on the Exercise model. Out of scope for v1.
