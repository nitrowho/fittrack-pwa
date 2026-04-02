<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
	import type { MuscleGroupStat } from '$lib/application/statistics/queries.js';

	Chart.register(DoughnutController, ArcElement, Tooltip);

	// Hardcoded colors matching CSS variables (Chart.js can't read CSS vars in canvas)
	const MUSCLE_COLORS: Record<string, string> = {
		ruecken: '#3B82F6',
		beine: '#22C55E',
		brust: '#EF4444',
		arme: '#F97316',
		schulter: '#A855F7'
	};

	interface Props {
		data: MuscleGroupStat[];
	}

	let { data }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>();
	let chart: Chart | null = null;

	function createChart() {
		chart?.destroy();
		chart = null;
		if (!canvas || data.length === 0) return;

		chart = new Chart(canvas, {
			type: 'doughnut',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						data: data.map((d) => d.volume),
						backgroundColor: data.map((d) => MUSCLE_COLORS[d.muscleGroup] ?? '#6B7280'),
						borderWidth: 0
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '60%',
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const stat = data[ctx.dataIndex];
								return `${stat.label}: ${stat.percentage}%`;
							}
						}
					}
				}
			}
		});
	}

	onDestroy(() => {
		chart?.destroy();
	});

	$effect(() => {
		// Track data reactively; wait for DOM update so canvas binding is current
		const currentData = data;
		if (currentData) {
			tick().then(() => {
				createChart();
			});
		}
	});
</script>

<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<h3 class="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Muskelgruppen</h3>
	{#if data.length === 0}
		<p class="text-sm text-gray-400">Keine Daten vorhanden</p>
	{:else}
		<div class="flex items-center gap-4">
			<div class="h-40 w-40 shrink-0">
				<canvas bind:this={canvas}></canvas>
			</div>
			<div class="flex flex-col gap-1.5">
				{#each data as stat}
					<div class="flex items-center gap-2">
						<span
							class="inline-block h-3 w-3 rounded-full"
							style="background-color: {MUSCLE_COLORS[stat.muscleGroup] ?? '#6B7280'}"
						></span>
						<span class="text-xs">
							{stat.label}
							<span class="text-gray-500 dark:text-gray-400">{stat.percentage}%</span>
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
