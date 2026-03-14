# FitTrack PWA — Migration & Development

## Migration from iOS App

Users can export data from the iOS app (JSON format) and import it into the PWA:

1. Export from iOS app via ExportView (JSON format)
2. In PWA Settings, use "Daten importieren" to load the exported JSON
3. Map iOS export format to PWA database schema
4. Insert records into Dexie

This requires a one-time import adapter that understands the iOS export format (`version: 1`, session-oriented structure) and transforms it into the PWA's table-oriented backup format.

## Database Versioning

Dexie supports schema migrations via `this.version(N).stores(...)`. When the schema changes:

1. Increment version number
2. Define new indexes
3. Provide upgrade function if data transformation is needed

Backup files include `backupVersion` to detect format changes during restore.

---

## Development & Deployment

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
