<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { onMount } from 'svelte';
	import { appStore } from '$lib/stores/app.svelte.js';

	let { children } = $props();

	onMount(async () => {
		await appStore.initialize();
	});
</script>

<svelte:head>
	{#if pwaInfo?.webManifest?.linkTag}
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>

<main class="min-h-screen bg-gray-50 pb-20 pt-[env(safe-area-inset-top)] text-gray-900 dark:bg-gray-950 dark:text-gray-100">
	{#if appStore.initialized}
		{@render children()}
	{:else if appStore.initializationError}
		<div class="p-4">
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<h1 class="text-lg font-semibold">App konnte nicht geladen werden</h1>
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{appStore.initializationError}</p>
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
					Bitte prüfe, ob Safari lokalen Speicher erlaubt, und lade die App anschließend neu.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex min-h-screen items-center justify-center p-4">
			<p class="text-sm text-gray-500">FitTrack wird geladen...</p>
		</div>
	{/if}
</main>

{#if appStore.initialized}
	<BottomNav />
{/if}

{#await import('$lib/components/ReloadPrompt.svelte') then { default: ReloadPrompt }}
	<ReloadPrompt />
{/await}
