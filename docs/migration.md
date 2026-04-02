# FitTrack PWA — Migration & Development

## Current Migration State

The app currently supports backup and restore of its own JSON backup format. A dedicated import adapter from the legacy iOS app export format is not implemented in this repository yet.

What exists today:

- full local backup export
- full local backup restore
- versioned backup format via `backupVersion`

What does not exist yet:

- direct import of the iOS app's export JSON
- automatic migration tooling between the iOS data shape and the PWA tables

## Database Versioning

The Dexie schema currently has two versions:

1. Initial workout schema
2. Added `settings` table and upgrade logic for legacy `Exercise.isBarbell`

When changing the schema:

1. Increment the Dexie version in `src/lib/db/database.ts`
2. Add or adjust store definitions
3. Add an upgrade function when existing data must be transformed
4. Decide whether backup compatibility changes are required

Backup restore currently expects `backupVersion: 1`.

## Local Development

```bash
pnpm install
pnpm run dev
pnpm run check
pnpm run build
pnpm run preview
```

Notes:

- The app is a static SvelteKit SPA
- `pnpm run check` is the main validation command
- There is no automated unit or E2E test setup at the moment

## Deployment

The production build is static output from Vite/SvelteKit and can be deployed to common static hosts such as:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

## Practical Migration Guidance

If an iOS import path is added later, it should live below the UI layer and perform:

1. format validation
2. shape transformation into the PWA tables
3. explicit transaction boundaries for inserts
4. compatibility/version checks before writing
