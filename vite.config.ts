import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	preview: {
		allowedHosts: ['.trycloudflare.com']
	},
	plugins: [
		sveltekit(),
		tailwindcss(),
		SvelteKitPWA({
			registerType: 'prompt',
			kit: {
				adapterFallback: 'index.html',
				spa: true
			},
			manifest: {
				name: 'FitTrack',
				short_name: 'FitTrack',
				description: 'Workout Tracking',
				start_url: '/',
				display: 'standalone',
				orientation: 'portrait',
				background_color: '#000000',
				theme_color: '#000000',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
				clientsClaim: true,
				skipWaiting: true
			}
		})
	]
});
