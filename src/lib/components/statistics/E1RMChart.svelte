<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip
	} from 'chart.js';
	import type { E1RMHistoryExercise } from '$lib/application/statistics/queries.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

	interface Props {
		exercises: E1RMHistoryExercise[];
	}

	let { exercises }: Props = $props();

	let selectedIndex = $state(0);
	let canvas = $state<HTMLCanvasElement | undefined>();
	let chart: Chart | null = null;

	let selected = $derived(exercises[selectedIndex] ?? null);

	function isDark(): boolean {
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function getColors() {
		const dark = isDark();
		return {
			line: dark ? '#34D399' : '#10B981',
			point: dark ? '#34D399' : '#10B981',
			grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			text: dark ? '#9CA3AF' : '#6B7280'
		};
	}

	function createChart() {
		if (!canvas || !selected) return;
		chart?.destroy();

		const colors = getColors();
		const history = selected.history;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: history.map((p) => p.label),
				datasets: [
					{
						data: history.map((p) => p.estimated1RM),
						borderColor: colors.line,
						backgroundColor: colors.point,
						borderWidth: 2,
						tension: 0.3,
						pointRadius: history.length > 20 ? 2 : 4,
						pointBackgroundColor: colors.point
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const val = ctx.parsed.y ?? 0;
								return `est. 1RM: ${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(val)} kg`;
							}
						}
					}
				},
				scales: {
					x: {
						grid: { color: colors.grid },
						ticks: {
							color: colors.text,
							font: { size: 11 },
							maxRotation: 45,
							autoSkip: true,
							maxTicksLimit: 8
						}
					},
					y: {
						grid: { color: colors.grid },
						ticks: {
							color: colors.text,
							font: { size: 11 },
							callback: (value) => `${value} kg`
						}
					}
				}
			}
		});
	}

	let mediaQuery: MediaQueryList;
	function handleColorSchemeChange() {
		createChart();
	}

	onMount(() => {
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', handleColorSchemeChange);
	});

	onDestroy(() => {
		chart?.destroy();
		mediaQuery?.removeEventListener('change', handleColorSchemeChange);
	});

	$effect(() => {
		if (selectedIndex >= exercises.length && exercises.length > 0) {
			selectedIndex = 0;
			return;
		}

		if (canvas && selected) {
			createChart();
			return;
		}

		chart?.destroy();
		chart = null;
	});
</script>

<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<h3 class="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Geschätztes 1RM</h3>

	{#if exercises.length === 0}
		<p class="text-sm text-gray-400">Noch nicht genug Daten vorhanden</p>
	{:else}
		<!-- Exercise selector -->
		<select
			class="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium dark:border-gray-700 dark:bg-gray-800"
			value={selectedIndex}
			onchange={(e) => (selectedIndex = Number(e.currentTarget.value))}
		>
			{#each exercises as ex, i}
				<option value={i}>{ex.exerciseName}</option>
			{/each}
		</select>

		<!-- Chart -->
		<div class="h-48">
			<canvas bind:this={canvas}></canvas>
		</div>

		<!-- Current e1RM summary -->
		{#if selected}
			{@const latest = selected.history[selected.history.length - 1]}
			{@const first = selected.history[0]}
			{@const delta = latest.estimated1RM - first.estimated1RM}
			<div class="mt-3 flex items-center justify-between text-sm">
				<span class="text-gray-500 dark:text-gray-400">Aktuell</span>
				<span class="font-bold">{new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(latest.estimated1RM)} kg</span>
			</div>
			{#if selected.history.length >= 2}
				<div class="flex items-center justify-between text-sm">
					<span class="text-gray-500 dark:text-gray-400">Veränderung</span>
					<span class="font-semibold {delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : ''}">
						{delta > 0 ? '+' : ''}{new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(delta)} kg
					</span>
				</div>
			{/if}
		{/if}
	{/if}
</div>
