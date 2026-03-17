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
	{@render children()}
</main>

<BottomNav />

{#await import('$lib/components/ReloadPrompt.svelte') then { default: ReloadPrompt }}
	<ReloadPrompt />
{/await}
