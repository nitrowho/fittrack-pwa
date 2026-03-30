<script lang="ts">
	import { formatWeight } from '$lib/services/formatter.js';
	import type { PersonalRecord } from '$lib/application/statistics/queries.js';

	interface Props {
		records: PersonalRecord[];
	}

	let { records }: Props = $props();

	let expanded = $state(false);

	let displayRecords = $derived(expanded ? records : records.slice(0, 5));
</script>

<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<h3 class="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Persönliche Rekorde</h3>
	{#if records.length === 0}
		<p class="text-sm text-gray-400">Keine Rekorde vorhanden</p>
	{:else}
		<div class="space-y-3">
			{#each displayRecords as record}
				<div class="flex items-center justify-between">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{record.exerciseName}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							Bestes Gewicht: {formatWeight(record.bestWeight)}
						</p>
					</div>
					{#if record.bestEstimated1RM !== null}
						<div class="text-right">
							<p class="text-sm font-bold">{formatWeight(record.bestEstimated1RM)}</p>
							<p class="text-xs text-gray-500 dark:text-gray-400">est. 1RM</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		{#if records.length > 5}
			<button
				onclick={() => (expanded = !expanded)}
				class="mt-3 w-full text-center text-sm font-medium text-blue-500"
			>
				{expanded ? 'Weniger anzeigen' : `Alle ${records.length} anzeigen`}
			</button>
		{/if}
	{/if}
</div>
