# FitTrack PWA — PWA Configuration

## Current Setup

The PWA configuration is generated in `vite.config.ts` via `@vite-pwa/sveltekit`. There is no checked-in `static/manifest.webmanifest`; the plugin emits the manifest and service worker during build.

## Manifest

Current manifest configuration:

```ts
manifest: {
  name: 'FitTrack',
  short_name: 'FitTrack',
  description: 'Workout Tracking',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}
```

The generated manifest link tag is injected into `<head>` from `src/routes/+layout.svelte` using `virtual:pwa-info`.

## Service Worker

Current plugin settings:

```ts
SvelteKitPWA({
  registerType: 'prompt',
  kit: {
    adapterFallback: 'index.html',
    spa: true
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
    clientsClaim: true,
    skipWaiting: false
  }
})
```

Implications:

- Built assets are precached
- There is no runtime API caching layer because the app has no backend
- New versions are not forced immediately; the UI shows an update prompt
- The app shows a one-time "Bereit für Offline-Nutzung" toast when offline caching is ready
- The app surfaces an install prompt when the browser supports `beforeinstallprompt`
- The app shows an offline banner while the device is disconnected

## iOS Install Support

`src/app.html` includes:

- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `apple-touch-icon`
- a set of iPhone and iPad startup images in `static/splash/`

This is what currently powers the iOS home-screen install experience.

## Static Assets in Use

Checked-in PWA-related assets currently include:

- `static/icons/icon-192.png`
- `static/icons/icon-512.png`
- `static/icons/icon-512-maskable.png`
- `static/apple-touch-icon.png`
- `static/favicon.png`
- `static/splash/*.png`

## Hosting Requirements

The app is a static build and can be hosted on any static host that serves over HTTPS. HTTPS is required for:

- service worker registration
- installability
- browser features such as persistent storage and notifications in supported environments
