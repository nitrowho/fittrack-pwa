<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getStatisticsData,
		getPeriodLabel,
		type StatsPeriod,
		type StatisticsData
	} from '$lib/application/statistics/queries.js';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import { formatVolume, formatDuration } from '$lib/services/formatter.js';
	import StatCard from './StatCard.svelte';
	import VolumeChart from './VolumeChart.svelte';
	import MuscleGroupChart from './MuscleGroupChart.svelte';
	import PersonalRecords from './PersonalRecords.svelte';
	import E1RMChart from './E1RMChart.svelte';

	const periods: { value: StatsPeriod; label: string }[] = [
		{ value: 'week', label: 'Woche' },
		{ value: 'month', label: 'Monat' },
		{ value: 'all', label: 'Gesamt' }
	];

	let activePeriod = $state<StatsPeriod>('week');
	let periodOffset = $state(0);
	let stats = $state<StatisticsData | null>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);

	let periodLabel = $derived(getPeriodLabel(activePeriod, periodOffset));
	let canGoForward = $derived(periodOffset < 0);

	async function load() {
		loading = true;
		loadError = null;

		try {
			stats = await getStatisticsData(activePeriod, periodOffset);
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Statistiken konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	function switchPeriod(period: StatsPeriod) {
		activePeriod = period;
		periodOffset = 0;
	}

	onMount(load);

	$effect(() => {
		// Reload when period or offset changes
		activePeriod;
		periodOffset;
		load();
	});
</script>

<div class="space-y-4">
	<!-- Period toggle -->
	<div class="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
		{#each periods as period}
			<button
				onclick={() => switchPeriod(period.value)}
				class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activePeriod ===
				period.value
					? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				{period.label}
			</button>
		{/each}
	</div>

	<!-- Period navigation -->
	{#if activePeriod !== 'all'}
		<div class="flex items-center justify-between">
			<button
				onclick={() => periodOffset--}
				class="rounded-lg p-2 text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-800"
				aria-label="Vorheriger Zeitraum"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			</button>
			<button
				onclick={() => (periodOffset = 0)}
				class="text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				{periodLabel}
			</button>
			<button
				onclick={() => periodOffset++}
				disabled={!canGoForward}
				class="rounded-lg p-2 text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-800 {!canGoForward ? 'opacity-30' : ''}"
				aria-label="Nächster Zeitraum"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	{/if}

	<ErrorBoundary
		loading={loading && !stats}
		error={loadError}
		title="Statistiken konnten nicht geladen werden"
		onretry={load}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="flex gap-3">
					<div class="h-24 flex-1 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
					<div class="h-24 flex-1 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
					<div class="h-24 flex-1 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				</div>
				<div class="h-56 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-56 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

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

		<!-- e1RM progression chart -->
		<E1RMChart exercises={stats.e1rmHistory} />

		<!-- Muscle group distribution -->
		<MuscleGroupChart data={stats.muscleGroupDistribution} />

		<!-- Personal records -->
		<PersonalRecords records={stats.personalRecords} />
	{/if}
	</ErrorBoundary>
</div>
