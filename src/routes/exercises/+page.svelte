<script lang="ts">
	import { onMount } from 'svelte';
	import {
		deleteExercise,
		saveExercise as persistExercise
	} from '$lib/application/exercises/commands.js';
	import { listExercises } from '$lib/application/exercises/queries.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import { MUSCLE_GROUP_LABELS, type MuscleGroup, type Exercise } from '$lib/models/types.js';

	let exercises = $state<Exercise[]>([]);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let formName = $state('');
	let formMuscleGroup = $state<MuscleGroup | ''>('');
	let formIsBarbell = $state(false);
	let deleteTarget = $state<string | null>(null);
	let dropdownOpen = $state(false);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	const muscleGroups: MuscleGroup[] = ['ruecken', 'beine', 'brust', 'arme', 'schulter'];

	onMount(loadExercises);

	async function loadExercises() {
		loading = true;
		loadError = null;

		try {
			exercises = await listExercises();
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Übungen konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	let grouped = $derived(() => {
		const groups = new Map<string, Exercise[]>();
		for (const e of exercises) {
			const key = e.muscleGroup ?? 'sonstige';
			const list = groups.get(key) ?? [];
			list.push(e);
			groups.set(key, list);
		}
		return groups;
	});

	function startCreate() {
		editingId = null;
		formName = '';
		formMuscleGroup = '';
		formIsBarbell = false;
		dropdownOpen = false;
		showForm = true;
	}

	function startEdit(exercise: Exercise) {
		editingId = exercise.id;
		formName = exercise.name;
		formMuscleGroup = exercise.muscleGroup ?? '';
		formIsBarbell = exercise.isBarbell;
		dropdownOpen = false;
		showForm = true;
	}

	function selectMuscleGroup(value: MuscleGroup | '') {
		formMuscleGroup = value;
		dropdownOpen = false;
	}

	const selectedLabel = $derived(
		formMuscleGroup ? MUSCLE_GROUP_LABELS[formMuscleGroup] : 'Keine Muskelgruppe'
	);

	async function handleSaveExercise() {
		if (!formName.trim()) return;

		const mg = formMuscleGroup || null;
		await persistExercise({
			id: editingId ?? undefined,
			name: formName,
			muscleGroup: mg,
			isBarbell: formIsBarbell
		});

		showForm = false;
		await loadExercises();
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		await deleteExercise(deleteTarget);
		deleteTarget = null;
		await loadExercises();
	}

	const groupOrder: (MuscleGroup | 'sonstige')[] = [...muscleGroups, 'sonstige'];
	const groupLabels: Record<string, string> = {
		...MUSCLE_GROUP_LABELS,
		sonstige: 'Sonstige'
	};
</script>

<div class="space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Übungen</h1>
		<button onclick={startCreate} class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white">
			Neue Übung
		</button>
	</div>

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Übungen konnten nicht geladen werden"
		onretry={loadExercises}
	>
		{#snippet loadingContent()}
			<div class="space-y-2">
				<div class="h-16 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-16 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-16 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

		{#if showForm}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<h3 class="mb-3 font-semibold">{editingId ? 'Übung bearbeiten' : 'Neue Übung'}</h3>
				<input
					type="text"
					bind:value={formName}
					placeholder="Name"
					class="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
				/>
				<div class="relative mb-3">
					<button
						type="button"
						onclick={() => (dropdownOpen = !dropdownOpen)}
						class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
					>
						<span class={formMuscleGroup ? '' : 'text-gray-400'}>{selectedLabel}</span>
						<svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					{#if dropdownOpen}
						<div class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
							<button
								type="button"
								onclick={() => selectMuscleGroup('')}
								class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {formMuscleGroup === '' ? 'font-semibold' : ''}"
							>
								Keine Muskelgruppe
							</button>
							{#each muscleGroups as mg}
								<button
									type="button"
									onclick={() => selectMuscleGroup(mg)}
									class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {formMuscleGroup === mg ? 'font-semibold' : ''}"
								>
									{MUSCLE_GROUP_LABELS[mg]}
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<div class="mb-3 flex items-center gap-3">
					<div
						role="switch"
						aria-checked={formIsBarbell}
						aria-label="Langhantel-Übung"
						tabindex="0"
						onclick={() => (formIsBarbell = !formIsBarbell)}
						onkeydown={(e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); formIsBarbell = !formIsBarbell; } }}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors {formIsBarbell ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}"
					>
						<span
							class="inline-block h-4 w-4 rounded-full bg-white transition-transform {formIsBarbell ? 'translate-x-6' : 'translate-x-1'}"
						></span>
					</div>
					<span class="text-sm">Langhantel-Übung</span>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => (showForm = false)}
						class="flex-1 rounded-xl bg-gray-100 py-2 text-sm dark:bg-gray-800"
					>
						Abbrechen
					</button>
					<button
						onclick={handleSaveExercise}
						disabled={!formName.trim()}
						class="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-medium text-white disabled:opacity-50"
					>
						Speichern
					</button>
				</div>
			</div>
		{/if}

		{#if exercises.length === 0}
			<EmptyState
				title="Noch keine Übungen"
				message="Lege deine ersten Übungen an, damit du sie in Vorlagen und Workouts nutzen kannst."
			/>
		{:else}
			{#each groupOrder as group}
				{@const groupExercises = grouped().get(group)}
				{#if groupExercises && groupExercises.length > 0}
					<section>
						<h2 class="mb-2 text-sm font-semibold text-gray-500">{groupLabels[group]}</h2>
						<div class="space-y-1">
							{#each groupExercises as exercise}
								<div class="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
									<span class="flex-1 text-sm font-medium">{exercise.name}</span>
									<button
										onclick={() => startEdit(exercise)}
										class="p-1 text-gray-400"
										aria-label="Bearbeiten"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										onclick={() => (deleteTarget = exercise.id)}
										class="p-1 text-red-500"
										aria-label="Löschen"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		{/if}
	</ErrorBoundary>
</div>

<ConfirmDialog
	open={deleteTarget !== null}
	title="Übung löschen?"
	message="Die Übung wird aus allen Vorlagen entfernt."
	confirmText="Löschen"
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
/>
