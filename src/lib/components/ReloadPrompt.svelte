<script lang="ts">
	import { onMount } from 'svelte';

	let needRefresh = $state(false);
	let offlineReady = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = $state(null);

	const OFFLINE_READY_KEY = 'fittrack-offline-ready-shown';

	function showOfflineReady() {
		if (localStorage.getItem(OFFLINE_READY_KEY)) return;
		localStorage.setItem(OFFLINE_READY_KEY, '1');
		offlineReady = true;
		setTimeout(() => {
			offlineReady = false;
		}, 4000);
	}

	onMount(async () => {
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
		} catch {
			// PWA registration not available in dev
		}
	});

	function update() {
		updateSW?.(true);
	}

	function dismiss() {
		needRefresh = false;
	}
</script>

{#if offlineReady}
	<div class="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-green-600 p-4 shadow-lg">
		<p class="text-sm font-medium text-white">Bereit für Offline-Nutzung</p>
	</div>
{/if}

{#if needRefresh}
	<div class="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900">
		<p class="mb-3 text-sm font-medium">Neue Version verfügbar</p>
		<div class="flex gap-2">
			<button
				onclick={dismiss}
				class="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800"
			>
				Später
			</button>
			<button
				onclick={update}
				class="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white"
			>
				Aktualisieren
			</button>
		</div>
	</div>
{/if}
