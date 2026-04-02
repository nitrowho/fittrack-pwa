<script lang="ts">
	import type { ProgressInsight } from '$lib/application/gamification/queries.js';

	interface Props {
		insights: ProgressInsight[];
	}

	let { insights }: Props = $props();
</script>

{#if insights.length > 0}
	<section>
		<h2 class="mb-3 text-lg font-semibold">Fortschritt</h2>
		<div class="space-y-2">
			{#each insights as insight}
				<div class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
						<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">{insight.message}</p>
						<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Letzte 4 Wochen vs. davor</p>
					</div>
					<span class="shrink-0 text-sm font-bold text-green-600 dark:text-green-400">
						+{insight.percentChange}%
					</span>
				</div>
			{/each}
		</div>
	</section>
{/if}
