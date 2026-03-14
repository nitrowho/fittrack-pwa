# FitTrack PWA — Overview & Tech Stack

## 1. Overview

FitTrack PWA is a mobile-first Progressive Web App that replicates the full functionality of the existing FitTrack iOS app. It runs entirely in the browser, stores all data locally in IndexedDB, and can be installed on the home screen for a native-like experience — with no signing, no expiry, and no app store.

### Goals

- **Feature parity** with the iOS app (workout tracking, rest timers, progression engine, live comparison, data export)
- **Offline-first** — works without internet, all data local
- **Installable** — "Add to Home Screen" on iOS/Android for native feel
- **Manual backup/restore** — JSON file export/import to prevent data loss
- **No backend** — fully client-side, zero infrastructure

### Non-Goals (for now)

- Cloud sync / multi-device sync
- Push notifications (limited iOS PWA support)
- User accounts / authentication

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | SvelteKit (static adapter) | Minimal boilerplate, small bundle, reactive model similar to SwiftUI's `@Observable` |
| **Build** | Vite | Fast dev server, HMR, native ESM |
| **PWA** | vite-plugin-pwa | Service worker generation, web manifest, offline caching |
| **Storage** | Dexie.js (IndexedDB) | Typed IndexedDB wrapper with live queries, versioned schema migrations |
| **Styling** | Tailwind CSS | Utility-first, mobile-first responsive design |
| **Language** | TypeScript | Type safety across models and business logic |
| **Notifications** | Web Notifications API | Rest timer completion alerts (where supported) |
| **Export** | Native `Blob` + `URL.createObjectURL` | CSV/JSON file generation and download |
| **Haptics** | `navigator.vibrate()` | Set completion feedback (Android only; no-op on iOS) |

### No Dependencies On

- Any backend / API server
- Any database server
- Any authentication provider
- Any third-party UI component library

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Framework** | SvelteKit (static, no SSR) |
| **State** | Svelte 5 runes ($state, $derived, $effect) |
| **Storage** | Dexie.js (IndexedDB) |
| **Styling** | Tailwind CSS |
| **PWA** | vite-plugin-pwa (precache, manifest) |
| **Timers** | Date-based (endDate - now), 1 Hz setInterval |
| **Backup** | Full DB dump as JSON file (download/upload) |
| **Export** | CSV (semicolon) + JSON (ISO8601), versioned |
| **Language** | German (hardcoded, no i18n) |
| **Hosting** | Any static host (Vercel, Netlify, etc.) |
| **iOS migration** | One-time JSON import from iOS export |
