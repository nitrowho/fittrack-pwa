<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { TEMPLATE_EXERCISE_DEFAULTS } from '$lib/constants.js';
	import { createTemplate } from '$lib/application/templates/commands.js';
	import { listTemplateFormExercises } from '$lib/application/templates/queries.js';
	import type { TemplateExerciseInput } from '$lib/application/templates/types.js';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import MuscleGroupBadge from '$lib/components/MuscleGroupBadge.svelte';
	import type { Exercise } from '$lib/models/types.js';

	let name = $state('');
	let exercises = $state<Exercise[]>([]);
	let selectedExercises = $state<TemplateExerciseInput[]>([]);
	let searchQuery = $state('');
	let showPicker = $state(false);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadFormData();
	});

	async function loadFormData() {
		loading = true;
		loadError = null;

		try {
			exercises = await listTemplateFormExercises();
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Übungen konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	let filteredExercises = $derived(
		exercises.filter(
			(e) =>
				e.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!selectedExercises.some((se) => se.exerciseId === e.id)
		)
	);

	let groupedExercises = $derived(() => {
		const groups = new Map<string, Exercise[]>();
		for (const e of filteredExercises) {
			const key = e.muscleGroup ?? 'sonstige';
			const list = groups.get(key) ?? [];
			list.push(e);
			groups.set(key, list);
		}
		return groups;
	});

	function addExercise(exerciseId: string) {
		selectedExercises = [
			...selectedExercises,
			{
				exerciseId,
				targetSets: TEMPLATE_EXERCISE_DEFAULTS.targetSets,
				repRangeLower: TEMPLATE_EXERCISE_DEFAULTS.repRangeLower,
				repRangeUpper: TEMPLATE_EXERCISE_DEFAULTS.repRangeUpper,
				restDurationSeconds: TEMPLATE_EXERCISE_DEFAULTS.restDurationSeconds
			}
		];
		showPicker = false;
		searchQuery = '';
	}

	function removeExercise(index: number) {
		selectedExercises = selectedExercises.filter((_, i) => i !== index);
	}

	function moveUp(index: number) {
		if (index === 0) return;
		const arr = [...selectedExercises];
		[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
		selectedExercises = arr;
	}

	function moveDown(index: number) {
		if (index === selectedExercises.length - 1) return;
		const arr = [...selectedExercises];
		[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
		selectedExercises = arr;
	}

	function getExerciseName(id: string): string {
		return exercises.find((e) => e.id === id)?.name ?? 'Unknown';
	}

	async function save() {
		if (!name.trim() || selectedExercises.length === 0) return;

		await createTemplate({ name, exercises: selectedExercises });
		goto(`${base}/templates`);
	}
</script>

<div class="space-y-4 p-4">
	<div>
		<a href="{base}/templates" class="text-sm text-blue-500">&larr; Vorlagen</a>
		<h1 class="mt-1 text-2xl font-bold">Neue Vorlage</h1>
	</div>

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Vorlageneditor konnte nicht geladen werden"
		onretry={loadFormData}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="h-14 animate-pulse rounded-xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

		<input
			type="text"
			bind:value={name}
			placeholder="Name der Vorlage"
			class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
		/>

	<!-- Selected exercises -->
	<div class="space-y-2">
		{#each selectedExercises as se, i}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<div class="flex items-center justify-between">
					<h3 class="font-medium">{getExerciseName(se.exerciseId)}</h3>
					<div class="flex gap-1">
						<button onclick={() => moveUp(i)} class="p-1 text-gray-400" aria-label="Nach oben">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
							</svg>
						</button>
						<button onclick={() => moveDown(i)} class="p-1 text-gray-400" aria-label="Nach unten">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						<button onclick={() => removeExercise(i)} class="p-1 text-red-500" aria-label="Entfernen">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
				<div class="mt-2 grid grid-cols-2 gap-2">
					<label class="text-xs text-gray-500">
						Sätze
						<input
							type="number"
							bind:value={se.targetSets}
							min="1"
							class="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
						/>
					</label>
					<label class="text-xs text-gray-500">
						Wdh. (von–bis)
						<div class="mt-0.5 flex gap-1">
							<input
								type="number"
								bind:value={se.repRangeLower}
								min="1"
								class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
							/>
							<input
								type="number"
								bind:value={se.repRangeUpper}
								min="1"
								class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
							/>
						</div>
					</label>
					<label class="col-span-2 text-xs text-gray-500">
						Pause (Sekunden)
						<input
							type="number"
							bind:value={se.restDurationSeconds}
							min="0"
							step="15"
							class="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
						/>
					</label>
				</div>
			</div>
		{/each}
	</div>

	<!-- Add exercise button / picker -->
	{#if showPicker}
		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Übung suchen..."
				class="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
			/>
			<div class="max-h-60 space-y-1 overflow-y-auto">
				{#each filteredExercises as exercise}
					<button
						onclick={() => addExercise(exercise.id)}
						class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						<span class="flex-1">{exercise.name}</span>
						<MuscleGroupBadge muscleGroup={exercise.muscleGroup} />
					</button>
				{/each}
			</div>
			<button
				onclick={() => { showPicker = false; searchQuery = ''; }}
				class="mt-2 w-full text-center text-sm text-gray-500"
			>
				Abbrechen
			</button>
		</div>
	{:else}
		<button
			onclick={() => (showPicker = true)}
			class="w-full rounded-2xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 dark:border-gray-700"
		>
			+ Übung hinzufügen
		</button>
	{/if}

		<button
			onclick={save}
			disabled={!name.trim() || selectedExercises.length === 0}
			class="w-full rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
		>
			Vorlage speichern
		</button>
	</ErrorBoundary>
</div>
