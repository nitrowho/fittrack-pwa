# FitTrack PWA — Features

## Dashboard

- Resume card for the current in-progress workout, if one exists
- Quick-start list of all templates with exercise summaries
- Recommended next template based on the last completed template
- Button to start a free workout without a template
- Recent completed sessions with date and duration
- Weekly stats card with current streak and best streak record, linking directly to the statistics tab in history
- Streak-at-risk warning when the user has an active streak but no workouts yet this week
- Progress insight cards showing e1RM improvements per exercise (last 4 weeks vs. prior period)
- Achievement/badge cards with progress bars (14 badges covering workout count, volume, streak, and weight milestones)

## Active Workout

- Live session header with elapsed time, total volume, and volume delta versus the previous comparable session
- Expandable exercise cards with:
  - completed set count
  - configured set and rep target
  - progression recommendation banner
  - last-session comparison
  - inline rest timer
  - add/remove set actions
  - remove-exercise action for the current workout
- Add existing exercises to the active workout through a picker modal
- Workout notes section with debounced autosave while typing
- PR celebration toast with confetti animation when a new personal record is detected (weight, rep, volume, or e1RM)
- Finish confirmation and cancel confirmation
- Wake lock handling during active sessions, including reacquiring after visibility changes

## Set Logging

- Weight input with decimal support
- Reps input with numeric input mode
- Complete/uncomplete toggle per set
- Completed sets styled distinctly
- New workout sets are prefilled from the latest completed session for the same exercise
- Editing one incomplete set propagates weight and reps to the other incomplete sets of the same exercise
- Previous-set hint shown below each row when prior session data exists

## Rest Timers

- Per-exercise concurrent rest timers
- Date-based timer end timestamps rather than decrement-only counters
- Automatic recalculation after backgrounding because remaining time is derived from `Date.now()`
- Skip action
- Browser notification on completion when permission is granted
- One-second update cadence

## Progression

- Double-progression recommendation per exercise across all templates
- Increase recommendation when all completed sets in the latest comparable session meet the upper rep bound
- Stagnation hint after 3 or more consecutive comparable sessions with unchanged top weight and max reps
- One-tap application of suggested weight to all incomplete sets of the exercise

## History

### Verlauf

- List of completed sessions sorted newest first
- Monthly training calendar with highlighted training days
- Muscle-group dots per day in the calendar
- Date filter by tapping a day in the calendar
- Bulk selection mode to delete multiple history entries
- Session detail page with:
  - template name
  - formatted date
  - duration
  - total volume
  - completed sets grouped by exercise
  - session notes when present

### Statistiken

- Tab integrated into the history page
- Period toggle: Woche, Monat, Gesamt
- Previous/next period navigation for week and month views
- Summary cards for workout count, total volume, and average duration
- Current streak and best streak, based on training weeks
- Volume trend chart
- Estimated 1RM progression chart with exercise selector
- Muscle group distribution chart
- Personal records list

## Templates

- Template list with exercise counts
- Template detail page with sets, rep range, and rest duration per exercise
- Create template flow with:
  - template name
  - exercise picker with search
  - per-exercise sets, rep range, and rest duration editing
  - reorder and remove actions
- Edit template flow with the same controls
- Delete template with confirmation
- Start a workout directly from a template detail page

## Exercise Catalog

- List grouped by muscle group plus `Sonstige`
- Create and edit exercise form
- Optional muscle-group assignment
- `isBarbell` toggle for plate-calculator support
- Delete with confirmation

## Settings

- Theme preference: System, Hell, Dunkel
- Expandable plate configuration editor
- Storage persistence status banner
- Backup creation and restore
- CSV and JSON export of completed sessions
- About section showing the current app version

## Plate Calculator

- Available for exercises marked as barbell exercises
- Launches from the set row when a weight above 0 is entered
- Configurable bar weight and plate denominations
- Optional quantity limits per denomination
- Greedy per-side plate allocation
- Handles:
  - exact bar weight
  - weights below the bar
  - impossible loads
  - custom denominations

## Backup and Export

### Backup

- Full database export as JSON
- Includes all current tables, including `settings`
- Restore replaces all current local data after confirmation
- Backup file format is versioned via `backupVersion`

### Export

- CSV export with German headers and semicolon delimiter
- JSON export with `exportVersion`
- Only completed workout sessions are exported
- Only completed sets are included in the exported exercise data
