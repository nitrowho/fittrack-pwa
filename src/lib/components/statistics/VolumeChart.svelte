<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip
	} from 'chart.js';
	import type { VolumeTrendPoint } from '$lib/application/statistics/queries.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	interface Props {
		data: VolumeTrendPoint[];
	}

	let { data }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function isDark(): boolean {
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function getColors() {
		const dark = isDark();
		return {
			line: dark ? '#60A5FA' : '#3B82F6',
			fill: dark ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.1)',
			grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			text: dark ? '#9CA3AF' : '#6B7280'
		};
	}

	function createChart() {
		if (chart) chart.destroy();
		const colors = getColors();

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						data: data.map((d) => d.volume),
						borderColor: colors.line,
						backgroundColor: colors.fill,
						borderWidth: 2,
						fill: true,
						tension: 0.3,
						pointRadius: 4,
						pointBackgroundColor: colors.line
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
								return `${new Intl.NumberFormat('de-DE').format(val)} kg`;
							}
						}
					}
				},
				scales: {
					x: {
						grid: { color: colors.grid },
						ticks: { color: colors.text, font: { size: 11 } }
					},
					y: {
						beginAtZero: true,
						grid: { color: colors.grid },
						ticks: {
							color: colors.text,
							font: { size: 11 },
							callback: (value) => {
								if (value == null) return '';
								const v = Number(value);
								return v >= 1000
									? `${new Intl.NumberFormat('de-DE').format(v / 1000)}k`
									: String(v);
							}
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
		createChart();
		mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', handleColorSchemeChange);
	});

	onDestroy(() => {
		chart?.destroy();
		mediaQuery?.removeEventListener('change', handleColorSchemeChange);
	});

	$effect(() => {
		// Re-create chart when data changes
		if (canvas && data) {
			createChart();
		}
	});
</script>

<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
	<h3 class="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Volumen-Trend</h3>
	<div class="h-48">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
