# FitTrack PWA — UI & Design

## Layout

- Mobile-first layout optimized around phone widths
- Shared shell with fixed bottom navigation
- 5 tabs: Start, Verlauf, Vorlagen, Übungen, Einstellungen
- Safe-area padding for notched devices and home indicator space
- Statistics live inside the history route rather than as a separate top-level tab

## Visual Design

- Light and dark themes are supported
- Theme can be set to System, Hell, or Dunkel
- Theme is applied before first paint from `localStorage` to avoid flashes
- Primary card-based interface with rounded surfaces and compact spacing
- Muscle-group colors are defined as shared CSS theme variables:
  - Rücken: blue
  - Beine: green
  - Brust: red
  - Arme: orange
  - Schulter: purple
- Typography currently uses a system sans stack defined in `src/app.css`
- Icons are inline SVGs throughout the UI

## Interaction Patterns

- Expand/collapse exercise cards inside an active workout
- Modal-style picker for adding exercises to an active workout
- Inline segmented controls for theme selection and statistics period selection
- Confirmation dialogs for destructive actions such as delete, cancel workout, and restore backup
- Update toast and offline-ready toast for the PWA lifecycle
- Haptic feedback on set completion where the platform supports `navigator.vibrate`

## Workout-Specific UI

- Dashboard surfaces resume, quick start, and weekly summary first
- Active workout emphasizes fast set entry with large tap targets
- Rest timers are embedded directly inside each exercise card
- Notes are shown as an expandable section within the workout
- Plate calculation opens from the set row for barbell exercises

## Accessibility and Input

- Semantic buttons, links, labels, and form controls are used throughout
- Icon-only actions use `aria-label`
- Numeric inputs use mobile-friendly `inputmode` values
- Keyboard interaction exists for controls such as the exercise form toggle, although the primary target remains touch devices

## Current Constraints

- The app is usable on larger screens, but the design is still phone-first
- There is no desktop-specific layout system
- No third-party UI component library is used
