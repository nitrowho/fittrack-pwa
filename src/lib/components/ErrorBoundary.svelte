<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		loading: boolean;
		error: string | null;
		title?: string;
		retryLabel?: string;
		onretry?: (() => void | Promise<void>) | null;
		children?: Snippet;
		loadingContent?: Snippet;
	}

	let {
		loading,
		error,
		title = 'Inhalt konnte nicht geladen werden',
		retryLabel = 'Erneut versuchen',
		onretry = null,
		children,
		loadingContent
	}: Props = $props();
</script>

{#if error}
	<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
		<h2 class="text-base font-semibold">{title}</h2>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{error}</p>
		{#if onretry}
			<button
				type="button"
				onclick={() => onretry?.()}
				class="mt-4 min-h-12 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white"
			>
				{retryLabel}
			</button>
		{/if}
	</div>
{:else if loading}
	{#if loadingContent}
		{@render loadingContent()}
	{:else}
		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<p class="text-sm text-gray-500 dark:text-gray-400">Lädt...</p>
		</div>
	{/if}
{:else}
	{@render children?.()}
{/if}
