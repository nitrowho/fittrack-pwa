<script lang="ts">
	import { onMount } from 'svelte';
	import { listExercisesByName } from '$lib/repositories/exercise-repository.js';
	import { MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup } from '$lib/models/types.js';
	import MuscleGroupBadge from './MuscleGroupBadge.svelte';

	interface Props {
		open: boolean;
		excludeExerciseIds?: string[];
		onselect: (exercise: Exercise) => void;
		onclose: () => void;
	}

	let { open, excludeExerciseIds = [], onselect, onclose }: Props = $props();

	let exercises = $state<Exercise[]>([]);
	let search = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);

	onMount(async () => {
		exercises = await listExercisesByName();
	});

	let availableExercises = $derived(
		exercises.filter((e) => !excludeExerciseIds.includes(e.id))
	);

	let filteredExercises = $derived(
		search.trim()
			? availableExercises.filter((e) =>
					e.name.toLowerCase().includes(search.trim().toLowerCase())
				)
			: availableExercises
	);

	let groupedExercises = $derived.by(() => {
		const groups = new Map<MuscleGroup | 'sonstige', Exercise[]>();
		for (const exercise of filteredExercises) {
			const key = exercise.muscleGroup ?? 'sonstige';
			const list = groups.get(key) ?? [];
			list.push(exercise);
			groups.set(key, list);
		}
		return groups;
	});

	const groupOrder: (MuscleGroup | 'sonstige')[] = [
		'brust',
		'ruecken',
		'schulter',
		'arme',
		'beine',
		'sonstige'
	];

	let sortedGroups = $derived(
		groupOrder
			.filter((key) => groupedExercises.has(key))
			.map((key) => ({
				key,
				label: key === 'sonstige' ? 'Sonstige' : MUSCLE_GROUP_LABELS[key],
				exercises: groupedExercises.get(key)!
			}))
	);

	function handleSelect(exercise: Exercise) {
		onselect(exercise);
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onclose();
		}
	}

	$effect(() => {
		if (open && searchInput) {
			searchInput.focus();
		}
		if (!open) {
			search = '';
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
		onclick={handleBackdropClick}
	>
		<div class="flex w-full max-w-lg flex-col rounded-t-2xl bg-white dark:bg-gray-900" style="max-height: calc(85vh - env(safe-area-inset-bottom, 0px));">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
				<h3 class="text-lg font-semibold">Übung hinzufügen</h3>
				<button
					onclick={onclose}
					aria-label="Schließen"
					class="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Search -->
			<div class="border-b border-gray-200 p-4 dark:border-gray-700">
				<input
					bind:this={searchInput}
					bind:value={search}
					type="text"
					placeholder="Übung suchen..."
					class="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm outline-none dark:bg-gray-800"
				/>
			</div>

			<!-- Exercise list -->
			<div class="flex-1 overflow-y-auto p-4 pb-24">
				{#if filteredExercises.length === 0}
					<p class="py-8 text-center text-sm text-gray-500">Keine Übungen gefunden</p>
				{:else}
					<div class="space-y-4">
						{#each sortedGroups as group}
							<div>
								<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
									{group.label}
								</h4>
								<div class="space-y-1">
									{#each group.exercises as exercise}
										<button
											onclick={() => handleSelect(exercise)}
											class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
										>
											<span class="text-sm font-medium">{exercise.name}</span>
											<MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
