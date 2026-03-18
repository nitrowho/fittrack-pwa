<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { listTemplatesWithCounts } from '$lib/application/templates/queries.js';
	import type { TemplateSummary } from '$lib/application/templates/types.js';

	let templates = $state<TemplateSummary[]>([]);

	onMount(async () => {
		templates = await listTemplatesWithCounts();
	});
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

	{#if templates.length === 0}
		<p class="text-sm text-gray-500">Keine Vorlagen vorhanden</p>
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
</div>
