<script lang="ts">
	import { onMount } from 'svelte';

	let needRefresh = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = $state(null);

	onMount(async () => {
		try {
			const { registerSW } = await import('virtual:pwa-register');
			updateSW = registerSW({
				onNeedRefresh() {
					needRefresh = true;
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

{#if needRefresh}
	<div class="fixed left-4 right-4 top-4 z-50 rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-900">
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
