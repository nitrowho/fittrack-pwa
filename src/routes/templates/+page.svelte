<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { listTemplatesWithCounts } from '$lib/application/templates/queries.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import type { TemplateSummary } from '$lib/application/templates/types.js';

	let templates = $state<TemplateSummary[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadTemplates();
	});

	async function loadTemplates() {
		loading = true;
		loadError = null;

		try {
			templates = await listTemplatesWithCounts();
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Vorlagen konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Vorlagen</h1>
		<a
			href="{base}/templates/new"
			class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white"
		>
			Neue Vorlage
		</a>
	</div>

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Vorlagen konnten nicht geladen werden"
		onretry={loadTemplates}
	>
		{#snippet loadingContent()}
			<div class="space-y-2">
				<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

		{#if templates.length === 0}
			<EmptyState
				title="Keine Vorlagen vorhanden"
				message="Lege eine Vorlage an, um Workouts schneller zu starten."
			/>
		{:else}
			<div class="space-y-2">
				{#each templates as item}
					<a
						href="{base}/templates/{item.template.id}"
						class="block rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
					>
						<h3 class="font-semibold">{item.template.name}</h3>
						<p class="mt-0.5 text-xs text-gray-500">
							{item.exerciseCount} Übungen
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</ErrorBoundary>
</div>
