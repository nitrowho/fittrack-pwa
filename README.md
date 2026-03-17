# FitTrack PWA

FitTrack PWA is a mobile-first, offline-first workout tracking app built with SvelteKit and designed to mirror the existing iOS FitTrack app. The application runs entirely in the browser, stores data locally in IndexedDB, and can be installed as a Progressive Web App on iPhone and Android.

## Features

- Workout tracking with templates and exercise sessions
- Offline-first behavior with local-only data storage
- Progressive overload support via a double progression engine
- Rest timers, live workout comparison, and training history
- Backup and restore using JSON export/import
- CSV export with German formatting
- Full German UI text

## Tech Stack

- SvelteKit with static adapter
- Svelte 5 runes
- TypeScript
- Dexie.js for IndexedDB
- Tailwind CSS
- `@vite-pwa/sveltekit` for PWA support
- `pnpm` for package management

## Requirements

- Node.js 20+ recommended
- `pnpm` installed globally

Install `pnpm` if needed:

```bash
npm install -g pnpm
```

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm run dev
```

3. Open the app in your browser:

```text
http://localhost:5173
```

## Available Scripts

```bash
pnpm run dev         # Start local development server
pnpm run build       # Create production build in /build
pnpm run preview     # Preview the production build locally
pnpm run check       # Run Svelte and TypeScript checks
pnpm run check:watch # Run checks in watch mode
```

## Project Structure

```text
src/
  routes/          # SvelteKit routes and pages
  lib/
    application/   # Feature commands and queries
    components/    # Reusable UI components
    db/            # IndexedDB setup, seed, backup
    domain/        # Pure business logic
    infrastructure/# Browser API integrations
    repositories/  # Data access layer
    stores/        # Reactive UI state
static/            # Icons and static assets
docs/              # Project documentation
```

## Main Routes

- `/` dashboard
- `/workout/[id]` active workout
- `/history` workout history
- `/history/[id]` workout details
- `/templates` template overview
- `/templates/new` create template
- `/templates/[id]` template details
- `/templates/[id]/edit` edit template
- `/exercises` exercise management
- `/settings` app settings, export, backup, restore

## Architecture Notes

- No backend is used. All data lives locally in IndexedDB.
- UI and route code should not access Dexie directly.
- Business workflows belong in application commands and queries.
- Multi-table writes and cascade deletes belong in repository/application code.
- User-visible text is German and currently hardcoded without an i18n framework.

## Building for Production

Create a static production build:

```bash
pnpm run build
```

The generated app is written to `build/` and can be deployed to any static host that supports HTTPS, such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

## Installing the PWA on iPhone

The iPhone installation flow works through Safari and requires the app to be served over HTTPS or from `localhost` during development.

1. Open the FitTrack PWA in **Safari** on the iPhone.
2. Tap the **Share** button.
3. Scroll down and tap **Add to Home Screen**.
4. Adjust the app name if desired.
5. Tap **Add**.
6. Launch FitTrack from the home screen like a native app.

### Notes for iPhone Users

- Installation only works from Safari, not from all third-party browsers on iOS.
- The app opens in standalone mode after installation.
- All workout data remains on the device in browser storage.
- If Safari data is cleared or the app is removed, local data can be lost unless a backup was exported first.
- For the best experience, use the installed home screen version instead of keeping the app in a browser tab.

## Development Notes

- The app is optimized for mobile-first layouts, especially around 375-430px viewport widths.
- Number and date formatting follow German locale conventions.
- Service worker support enables offline usage after the first successful load.
- PWA installation and service workers require HTTPS outside local development.

## Documentation

Additional project documentation is available in [`docs/`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs):

- [`docs/overview.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/overview.md)
- [`docs/architecture.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/architecture.md)
- [`docs/features.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/features.md)
- [`docs/data-model.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/data-model.md)
- [`docs/pwa-config.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/pwa-config.md)
- [`docs/development-rules.md`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/docs/development-rules.md)

## License

Private project.
