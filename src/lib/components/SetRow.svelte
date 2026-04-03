<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { ExerciseSet } from '$lib/models/types.js';
	import { formatWeight } from '$lib/services/formatter.js';

	interface Props {
		set: ExerciseSet;
		lastSet?: ExerciseSet | null;
		isBarbell?: boolean;
		oncomplete: (setId: string, weight: number, reps: number) => void;
		onuncomplete: (setId: string) => void;
		onupdate: (setId: string, changes: Partial<ExerciseSet>) => void;
		onopenplatecalc?: (weight: number) => void;
	}

	let { set, lastSet = null, isBarbell = false, oncomplete, onuncomplete, onupdate, onopenplatecalc }: Props = $props();

	function handleToggle() {
		if (set.isCompleted) {
			onuncomplete(set.id);
		} else {
			oncomplete(set.id, set.weight, set.reps);
		}
	}

	function handleWeightChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value) || 0;
		onupdate(set.id, { weight: value });
	}

	function handleRepsChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value) || 0;
		onupdate(set.id, { reps: value });
	}
</script>

<div
	class="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors {set.isCompleted
		? 'bg-green-50 dark:bg-green-950'
		: 'bg-gray-50 dark:bg-gray-900'}"
>
	<span class="w-6 text-center text-xs font-medium text-gray-400">{set.setNumber}</span>

	<input
		type="number"
		step="0.5"
		inputmode="decimal"
		value={set.weight}
		onchange={handleWeightChange}
		disabled={set.isCompleted}
		class="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
		aria-label="Gewicht (kg)"
	/>
	<span class="text-xs text-gray-400">kg</span>

	{#if isBarbell && set.weight > 0 && onopenplatecalc}
		<button
			onclick={() => onopenplatecalc!(set.weight)}
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-blue-500"
			aria-label="Hantelscheiben-Rechner"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="9" width="3" height="6" rx="0.5" />
				<rect x="19" y="9" width="3" height="6" rx="0.5" />
				<rect x="5" y="7" width="3" height="10" rx="0.5" />
				<rect x="16" y="7" width="3" height="10" rx="0.5" />
				<line x1="8" y1="12" x2="16" y2="12" />
			</svg>
		</button>
	{/if}

	<input
		type="number"
		inputmode="numeric"
		value={set.reps}
		onchange={handleRepsChange}
		disabled={set.isCompleted}
		class="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
		aria-label="Wiederholungen"
	/>
	<span class="text-xs text-gray-400">Wdh</span>

	<button
		onclick={handleToggle}
		class="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors {set.isCompleted
			? 'bg-green-500 text-white'
			: 'border-2 border-gray-300 dark:border-gray-600'}"
		aria-label={set.isCompleted ? 'Satz rückgängig' : 'Satz abschließen'}
	>
		{#if set.isCompleted}
			<svg
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="3"
				in:scale={{ duration: 160, start: 0.5 }}
				out:scale={{ duration: 120, start: 0.8 }}
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
			</svg>
		{/if}
	</button>
</div>

{#if lastSet}
	<p class="mt-0.5 pl-9 text-xs text-gray-400">
		Vorher: {formatWeight(lastSet.weight)} &times; {lastSet.reps}
	</p>
{/if}
