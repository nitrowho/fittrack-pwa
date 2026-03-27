<script lang="ts">
	import { calculatePlates, findNearestAchievable } from '$lib/domain/plates/calculator.js';
	import { formatWeightPrecise } from '$lib/services/formatter.js';
	import type { PlateConfig } from '$lib/models/types.js';

	interface Props {
		open: boolean;
		targetWeight: number;
		plateConfig: PlateConfig;
		onclose: () => void;
	}

	let { open, targetWeight, plateConfig, onclose }: Props = $props();

	let result = $derived(calculatePlates(targetWeight, plateConfig));
	let nearest = $derived(
		result.impossible ? findNearestAchievable(targetWeight, plateConfig) : null
	);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div
			class="sheet-bottom-padding w-full max-w-lg animate-slide-up rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
			role="dialog"
			aria-label="Hantelscheiben-Rechner"
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Hantelscheiben-Rechner</h3>
				<button
					onclick={onclose}
					class="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					aria-label="Schließen"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Weight info -->
			<div class="mb-4 flex gap-4 text-sm">
				<div>
					<span class="text-gray-500">Zielgewicht</span>
					<p class="font-semibold">{formatWeightPrecise(targetWeight)}</p>
				</div>
				<div>
					<span class="text-gray-500">Stange</span>
					<p class="font-semibold">{formatWeightPrecise(plateConfig.barWeight)}</p>
				</div>
			</div>

			<!-- Warnings -->
			{#if result.belowBarWeight}
				<div class="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
					Gewicht ist geringer als Stangengewicht ({formatWeightPrecise(plateConfig.barWeight)})
				</div>
			{:else if result.impossible}
				<div class="space-y-2">
					<div class="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
						Dieses Gewicht ist mit den verfügbaren Scheiben nicht möglich.
						{#if nearest}
							Nächstmögliches Gewicht: {formatWeightPrecise(nearest.lower)}
							{#if nearest.upper !== nearest.lower}
								oder {formatWeightPrecise(nearest.upper)}
							{/if}
						{/if}
					</div>
					{#if result.perSide.length > 0}
						<div>
							<p class="mb-1 text-sm font-medium">Je Seite (nächstmöglich — {formatWeightPrecise(result.totalWeight)}):</p>
							<div class="space-y-1">
								{#each result.perSide as plate}
									<p class="text-sm">{plate.count} &times; {formatWeightPrecise(plate.weight)}</p>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else if result.perSide.length === 0}
				<div class="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
					Keine Scheiben nötig
				</div>
			{:else}
				<div>
					<p class="mb-2 text-sm font-medium">Je Seite:</p>
					<div class="space-y-1">
						{#each result.perSide as plate}
							<div class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
								<span class="text-sm font-semibold">{plate.count} &times; {formatWeightPrecise(plate.weight)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	:global(.animate-slide-up) {
		animation: slide-up 0.2s ease-out;
	}

	.sheet-bottom-padding {
		padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
	}
</style>
