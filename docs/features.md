# FitTrack PWA — Features

## Home / Dashboard

- **In-progress recovery**: If a WorkoutSession exists without `completedAt`, show a "Fortsetzen" (Resume) card linking to `/workout/[id]`
- **Quick start**: Show all templates with exercise summaries. Suggest next template based on alternating A/B pattern (query last completed session's `templateId`)
- **Recent sessions**: Last 3 completed sessions with date, duration, total volume

## Active Workout

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

## Set Logging

- Weight input: Number input with `step="0.5"` and `inputmode="decimal"`
- Reps input: Number input with `inputmode="numeric"`
- Complete/uncomplete toggle (circle → checkmark)
- Completed sets get visual distinction (green background, disabled inputs)
- Auto-populate: Changing weight/reps on one incomplete set updates all other incomplete sets in the same exercise
- Last session comparison per set: "Vorher: 60 kg × 10"

## Rest Timer

- **Date-based**: Store `endDate = Date.now() + restDurationSeconds * 1000`, compute remaining from `endDate - Date.now()`
- **Per-exercise**: Multiple timers can run concurrently
- **Display**: Circular progress arc + "M:SS" countdown
- **Skip**: Dismiss timer early
- **Notification**: Fire a Web Notification when timer reaches 0 (request permission on first use)
- **Background resilience**: On `visibilitychange → visible`, recalculate remaining from stored `endDate`

## Progression Engine

Identical logic to iOS:

- **Weight increase**: If all completed sets in the latest ExerciseSession (by `exerciseId`, across all templates) hit `repRangeUpper` → recommend `currentWeight + 1.0 kg`
- **Stagnation**: If weight and max reps unchanged for 3+ consecutive ExerciseSessions (by `exerciseId`, across all templates) → flag as stalled
- **UI**: Green banner for weight increase (tappable → apply to uncompleted sets), orange banner for stagnation (informational)

## Live Comparison

Comparison is always **per-exercise**, not per-template. When doing Workout A containing Bankdrücken, the comparison is with the last completed ExerciseSession for Bankdrücken — regardless of whether that was in Workout A or Workout B.

- **Query**: Find the most recent completed ExerciseSession with the same `exerciseId`, excluding the current session
- **Per-exercise**: Show last reps summary and volume delta
- **Per-set**: Show "Vorher: X kg × Y" below each set row
- **Session header**: Total volume delta (sum of all per-exercise deltas)

## History

- **List**: All completed sessions, sorted by `startedAt` descending
- **Row**: Template name, date, duration, total volume
- **Swipe to delete**: Swipe gesture or delete button
- **Detail view**: Duration, volume, duration/volume deltas vs. previous session, per-exercise breakdown with sets, progression insights, notes

## Templates

- **List**: All templates sorted by `sortOrder`
- **Detail**: Read-only view of exercises with sets × reps and rest duration
- **Create**: Name + add exercises (picker with search, grouped by muscle group)
- **Edit**: Rename, add/remove/reorder exercises, edit per-exercise parameters (sets, rep range, rest duration)
- **Delete**: With cascade to TemplateExercises

## Exercise Catalog

- **List**: Grouped by muscle group + "Sonstige" (Other/None)
- **Create**: Name + optional muscle group
- **Edit**: Name and muscle group
- **Delete**: With cascade to TemplateExercises

## Data Export

- **CSV**: Semicolon-delimited, German headers, version comment line
- **JSON**: ISO8601 dates, pretty-printed, versioned (`exportVersion: 1`)
- **Download**: Generate `Blob`, create download link via `URL.createObjectURL`
- **Only completed sessions and sets** are exported

## Backup & Restore

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

### Backup Format

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
