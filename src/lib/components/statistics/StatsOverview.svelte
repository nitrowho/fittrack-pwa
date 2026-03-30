<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getStatisticsData,
		type StatsPeriod,
		type StatisticsData
	} from '$lib/application/statistics/queries.js';
	import { formatVolume, formatDuration } from '$lib/services/formatter.js';
	import StatCard from './StatCard.svelte';
	import VolumeChart from './VolumeChart.svelte';
	import MuscleGroupChart from './MuscleGroupChart.svelte';
	import PersonalRecords from './PersonalRecords.svelte';

	const periods: { value: StatsPeriod; label: string }[] = [
		{ value: 'week', label: 'Woche' },
		{ value: 'month', label: 'Monat' },
		{ value: 'all', label: 'Gesamt' }
	];

	let activePeriod = $state<StatsPeriod>('week');
	let stats = $state<StatisticsData | null>(null);
	let loading = $state(false);

	async function load() {
		loading = true;
		stats = await getStatisticsData(activePeriod);
		loading = false;
	}

	onMount(load);

	$effect(() => {
		// Reload when period changes
		activePeriod;
		load();
	});
</script>

<div class="space-y-4">
	<!-- Period toggle -->
	<div class="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
		{#each periods as period}
			<button
				onclick={() => (activePeriod = period.value)}
				class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activePeriod ===
				period.value
					? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				{period.label}
			</button>
		{/each}
	</div>

	{#if stats}
		<!-- Summary cards -->
		<div class="flex gap-3">
			<StatCard
				label="Einheiten"
				value={String(stats.workoutCount)}
			/>
			<StatCard
				label="Volumen"
				value={formatVolume(stats.totalVolume)}
			/>
			<StatCard
				label="∅ Dauer"
				value={stats.averageDuration > 0 ? formatDuration(stats.averageDuration) : '–'}
			/>
		</div>

		<!-- Streak -->
		<div class="flex gap-3">
			<div class="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<p class="text-xs text-gray-500 dark:text-gray-400">Aktuelle Serie</p>
				<p class="mt-1 text-xl font-bold">
					{stats.currentStreak}
					<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
						{stats.currentStreak === 1 ? 'Woche' : 'Wochen'}
					</span>
					<span class="ml-0.5">🔥</span>
				</p>
			</div>
			<div class="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<p class="text-xs text-gray-500 dark:text-gray-400">Beste Serie</p>
				<p class="mt-1 text-xl font-bold">
					{stats.bestStreak}
					<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
						{stats.bestStreak === 1 ? 'Woche' : 'Wochen'}
					</span>
				</p>
			</div>
		</div>

		<!-- Volume trend chart -->
		{#if stats.volumeTrend.length > 0}
			<VolumeChart data={stats.volumeTrend} />
		{/if}

		<!-- Muscle group distribution -->
		<MuscleGroupChart data={stats.muscleGroupDistribution} />

		<!-- Personal records -->
		<PersonalRecords records={stats.personalRecords} />
	{:else if loading}
		<div class="flex items-center justify-center py-12">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
		</div>
	{/if}
</div>
