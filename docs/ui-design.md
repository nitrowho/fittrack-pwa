# FitTrack PWA — UI & Design

## Layout

- **Mobile-first**: Designed for 375px–430px viewport width
- **Bottom navigation bar**: 4 tabs — Home, History, Templates, Settings
- **No desktop optimization** (usable but not a priority)
- **Safe area insets**: Respect `env(safe-area-inset-*)` for notched devices

## Visual Design

- **Dark mode support**: User-selectable theme (System / Hell / Dunkel) via Settings → Design. Uses class-based Tailwind dark mode (`.dark` on `<html>`). An inline script in `app.html` reads the preference from `localStorage` before first paint to prevent flash. When set to "System", listens for OS `prefers-color-scheme` changes in real time.
- **Color palette**:
  - Muscle groups: Blue (Rücken), Green (Beine), Red (Brust), Orange (Arme), Purple (Schulter)
  - Positive delta: Green
  - Negative delta: Red
  - Rest timer: Blue accent
  - Completed sets: Green background
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- **Icons**: Inline SVG or a minimal icon set (no icon library dependency)

## Interactions

- **Haptic feedback**: `navigator.vibrate(10)` on set completion (Android only)
- **Swipe gestures**: For delete actions in lists (or fallback to explicit delete buttons)
- **Pull to refresh**: Not needed (all data is local and reactive)
- **Confirmation dialogs**: For destructive actions (delete session, cancel workout, restore backup)

## Accessibility

- Semantic HTML (`<button>`, `<input>`, `<nav>`, `<main>`, `<section>`)
- ARIA labels on icon-only buttons
- Sufficient color contrast (WCAG AA)
- Focus management on route changes
- Keyboard navigable (though primarily touch-optimized)
