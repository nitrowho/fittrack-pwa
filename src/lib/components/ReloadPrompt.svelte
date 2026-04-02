<script lang="ts">
	import { onMount } from 'svelte';

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	}

	let needRefresh = $state(false);
	let offlineReady = $state(false);
	let isOffline = $state(false);
	let showInstallPrompt = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = $state(null);
	let deferredInstallPrompt: BeforeInstallPromptEvent | null = $state(null);
	let registration: ServiceWorkerRegistration | null = null;

	const OFFLINE_READY_KEY = 'fittrack-offline-ready-shown';
	const INSTALL_PROMPT_DISMISSED_KEY = 'fittrack-install-prompt-dismissed';

	function showOfflineReady() {
		if (localStorage.getItem(OFFLINE_READY_KEY)) return;
		localStorage.setItem(OFFLINE_READY_KEY, '1');
		offlineReady = true;
		setTimeout(() => {
			offlineReady = false;
		}, 4000);
	}

	function isStandaloneMode(): boolean {
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			'navigator' in window && (window.navigator as Navigator & { standalone?: boolean }).standalone === true
		);
	}

	function handleConnectivityChange() {
		isOffline = !navigator.onLine;
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible' && registration) {
			registration.update();
		}
	}

	function handleBeforeInstallPrompt(event: Event) {
		event.preventDefault();
		if (isStandaloneMode() || localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)) {
			return;
		}

		deferredInstallPrompt = event as BeforeInstallPromptEvent;
		showInstallPrompt = true;
	}

	function dismissInstallPrompt() {
		showInstallPrompt = false;
		localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1');
	}

	async function installApp() {
		if (!deferredInstallPrompt) {
			return;
		}

		showInstallPrompt = false;
		await deferredInstallPrompt.prompt();
		const choice = await deferredInstallPrompt.userChoice;
		if (choice.outcome !== 'accepted') {
			localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1');
		}
		deferredInstallPrompt = null;
	}

	onMount(() => {
		handleConnectivityChange();

		void (async () => {
			try {
				const { registerSW } = await import('virtual:pwa-register');
				updateSW = registerSW({
					onNeedRefresh() {
						needRefresh = true;
					},
					onOfflineReady() {
						showOfflineReady();
					}
				});
				registration = await navigator.serviceWorker?.getRegistration();
			} catch {
				// PWA registration not available in dev
			}
		})();

		window.addEventListener('online', handleConnectivityChange);
		window.addEventListener('offline', handleConnectivityChange);
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			window.removeEventListener('online', handleConnectivityChange);
			window.removeEventListener('offline', handleConnectivityChange);
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	function update() {
		updateSW?.(true);
	}

	function dismiss() {
		needRefresh = false;
	}
</script>

<div class="pointer-events-none fixed bottom-24 left-4 right-4 z-50 space-y-3">
	{#if isOffline}
		<div class="pointer-events-auto rounded-2xl bg-amber-500 p-4 shadow-lg">
			<p class="text-sm font-medium text-white">Offline. Deine Daten bleiben lokal verfügbar.</p>
		</div>
	{/if}

	{#if offlineReady}
		<div class="pointer-events-auto rounded-2xl bg-green-600 p-4 shadow-lg">
			<p class="text-sm font-medium text-white">Bereit für Offline-Nutzung</p>
		</div>
	{/if}

	{#if showInstallPrompt}
		<div class="pointer-events-auto rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900">
			<p class="mb-1 text-sm font-medium text-gray-900 dark:text-white">FitTrack installieren</p>
			<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
				Füge die App deinem Startbildschirm hinzu, um sie wie eine native App zu starten.
			</p>
			<div class="flex gap-2">
				<button
					onclick={dismissInstallPrompt}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
				>
					Später
				</button>
				<button
					onclick={installApp}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white"
				>
					Installieren
				</button>
			</div>
		</div>
	{/if}

	{#if needRefresh}
		<div class="pointer-events-auto rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900">
			<p class="mb-3 text-sm font-medium text-gray-900 dark:text-white">Neue Version verfügbar</p>
			<div class="flex gap-2">
				<button
					onclick={dismiss}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
				>
					Später
				</button>
				<button
					onclick={update}
					class="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white"
				>
					Aktualisieren
				</button>
			</div>
		</div>
	{/if}
</div>
