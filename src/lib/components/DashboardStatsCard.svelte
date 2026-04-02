<script lang="ts">
	import { base } from '$app/paths';
	import { formatCompactVolume } from '$lib/services/formatter.js';
	import type { DashboardStats } from '$lib/application/statistics/queries.js';

	interface Props {
		stats: DashboardStats;
	}

	let { stats }: Props = $props();
</script>

<a
	href="{base}/history?tab=stats"
	class="block rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
>
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-medium text-gray-500 dark:text-gray-400">Diese Woche</span>
		<svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
		</svg>
	</div>
	<div class="flex items-baseline gap-4">
		<div class="flex-1 min-w-0">
			<p class="text-xl font-bold">{stats.workoutsThisWeek}</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{stats.workoutsThisWeek === 1 ? 'Einheit' : 'Einheiten'}
			</p>
		</div>
		<div class="flex-1 min-w-0">
			<p class="text-xl font-bold truncate">{formatCompactVolume(stats.volumeThisWeek)}</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">Volumen</p>
		</div>
		<div class="flex-1 min-w-0">
			<p class="text-xl font-bold">
				{stats.currentStreak}<span class="ml-0.5 text-sm">🔥</span>
			</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{stats.currentStreak === 1 ? 'Woche' : 'Wochen'}
				{#if stats.bestStreak > stats.currentStreak}
					<span class="text-gray-400 dark:text-gray-500">(Rekord: {stats.bestStreak})</span>
				{/if}
			</p>
		</div>
	</div>
</a>
