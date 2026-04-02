<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { getWorkoutProgressions } from '$lib/application/workouts/queries.js';
	import { getPlateConfig } from '$lib/application/settings/queries.js';
	import { listExercises } from '$lib/application/exercises/queries.js';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { timerStore } from '$lib/stores/timer.svelte.js';
	import { formatDuration, formatVolume, formatVolumeDelta } from '$lib/services/formatter.js';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import ExercisePickerModal from '$lib/components/ExercisePickerModal.svelte';
	import PlateCalculatorSheet from '$lib/components/PlateCalculatorSheet.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import type { ProgressionResult } from '$lib/domain/workouts/progression.js';
	import type { Exercise, ExerciseSet, PlateConfig } from '$lib/models/types.js';

	let progressions = $state<Map<string, ProgressionResult>>(new Map());
	let showFinishDialog = $state(false);
	let showCancelDialog = $state(false);
	let showExercisePicker = $state(false);
	let showNotes = $state(false);
	let barbellExerciseIds = $state<Set<string>>(new Set());
	let plateConfig = $state<PlateConfig>({ barWeight: 20, plates: [] });
	let showPlateCalc = $state(false);
	let plateCalcWeight = $state(0);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadWorkout();
	});

	async function loadWorkout() {
		const id = page.params.id as string;
		loading = true;
		loadError = null;

		try {
			if (!workoutStore.isActive || workoutStore.session?.id !== id) {
				await workoutStore.resumeWorkout(id);
			}
			if (!workoutStore.isActive) {
				goto(`${base}/`);
				return;
			}
			showNotes = !!workoutStore.session?.notes;
			await Promise.all([loadProgressions(), loadBarbellFlags(), loadPlateConfig()]);
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Das Workout konnte nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	let notesTimer: ReturnType<typeof setTimeout> | null = null;
	function handleNotesInput(value: string) {
		if (notesTimer) clearTimeout(notesTimer);
		notesTimer = setTimeout(() => workoutStore.updateNotes(value), 500);
	}

	async function loadBarbellFlags() {
		const exercises = await listExercises();
		barbellExerciseIds = new Set(exercises.filter((e) => e.isBarbell).map((e) => e.id));
	}

	async function loadPlateConfig() {
		plateConfig = await getPlateConfig();
	}

	function handleOpenPlateCalc(weight: number) {
		plateCalcWeight = weight;
		showPlateCalc = true;
	}

	async function loadProgressions() {
		progressions = await getWorkoutProgressions(workoutStore.exerciseSessions);
	}

	async function handleComplete(setId: string, weight: number, reps: number) {
		await workoutStore.completeSet(setId, weight, reps);
	}

	async function handleUncomplete(setId: string) {
		await workoutStore.uncompleteSet(setId);
	}

	async function handleUpdate(setId: string, changes: Partial<ExerciseSet>) {
		await workoutStore.updateSet(setId, changes);
	}

	async function handleAddSet(exerciseSessionId: string) {
		await workoutStore.addSet(exerciseSessionId);
	}

	async function handleRemoveSet(exerciseSessionId: string) {
		await workoutStore.removeSet(exerciseSessionId);
	}

	async function handleApplyWeight(exerciseSessionId: string, weight: number) {
		await workoutStore.applyWeightIncrease(exerciseSessionId, weight);
	}

	async function handleAddExercise(exercise: Exercise) {
		await workoutStore.addExercise(exercise);
		showExercisePicker = false;
		await loadProgressions();
	}

	async function handleRemoveExercise(exerciseSessionId: string) {
		await workoutStore.removeExercise(exerciseSessionId);
	}

	let usedExerciseIds = $derived(
		workoutStore.exerciseSessions.map((es) => es.exerciseId)
	);

	async function finishWorkout() {
		if (notesTimer) {
			clearTimeout(notesTimer);
			const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
			if (textarea) await workoutStore.updateNotes(textarea.value);
		}
		await workoutStore.finishWorkout();
		goto(`${base}/`);
	}

	async function cancelWorkout() {
		await workoutStore.cancelWorkout();
		goto(`${base}/`);
	}

	let totalSets = $derived(
		Array.from(workoutStore.sets.values()).reduce((sum, sets) => sum + sets.length, 0)
	);
	let completedSets = $derived(
		Array.from(workoutStore.sets.values()).reduce(
			(sum, sets) => sum + sets.filter((s) => s.isCompleted).length,
			0
		)
	);
</script>

<div class="p-4">
	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Workout konnte nicht geladen werden"
		onretry={loadWorkout}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-48 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

{#if workoutStore.isActive}
	<div class="space-y-4">
		<!-- Session header -->
		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<h1 class="text-xl font-bold">{workoutStore.session?.templateName}</h1>
			<div class="mt-2 flex gap-4 text-sm">
				<div>
					<span class="text-gray-500">Zeit</span>
					<p class="font-semibold">{formatDuration(timerStore.sessionElapsed)}</p>
				</div>
				<div>
					<span class="text-gray-500">Volumen</span>
					<p class="font-semibold">{formatVolume(workoutStore.totalVolume)}</p>
				</div>
				{#if workoutStore.volumeDelta !== 0}
					<div>
						<span class="text-gray-500">Delta</span>
						<p class="font-semibold {workoutStore.volumeDelta > 0 ? 'text-green-600' : 'text-red-500'}">
							{formatVolumeDelta(workoutStore.volumeDelta)}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Exercise cards -->
		{#each workoutStore.orderedExerciseSessions as es}
			<ExerciseCard
				exerciseSession={es}
				sets={workoutStore.sets.get(es.id) ?? []}
				lastSession={workoutStore.lastSessionData.get(es.id) ?? null}
				progression={progressions.get(es.id) ?? { type: 'none' }}
				isBarbell={barbellExerciseIds.has(es.exerciseId)}
				oncomplete={handleComplete}
				onuncomplete={handleUncomplete}
				onupdate={handleUpdate}
				onaddset={handleAddSet}
				onremoveset={handleRemoveSet}
				onapplyweight={handleApplyWeight}
				onremoveexercise={handleRemoveExercise}
				onopenplatecalc={handleOpenPlateCalc}
			/>
		{/each}

		<!-- Add exercise button -->
		<button
			onclick={() => (showExercisePicker = true)}
			class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 dark:border-gray-600 dark:text-gray-400"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Übung hinzufügen
		</button>

		<!-- Notes -->
		<button
			onclick={() => (showNotes = !showNotes)}
			class="flex w-full items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm dark:bg-gray-900 {workoutStore.session?.notes ? 'text-blue-500' : 'text-gray-500'}"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
			Notizen
			{#if workoutStore.session?.notes}
				<span class="text-xs text-gray-400">bearbeitet</span>
			{/if}
			<svg class="ml-auto h-4 w-4 transition-transform {showNotes ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if showNotes}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<textarea
					class="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
					rows="3"
					placeholder="Notizen zum Workout..."
					value={workoutStore.session?.notes ?? ''}
					oninput={(e) => handleNotesInput(e.currentTarget.value)}
				></textarea>
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex gap-3 pt-2">
			<button
				onclick={() => (showCancelDialog = true)}
				class="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white"
			>
				Abbrechen
			</button>
			<button
				onclick={() => (showFinishDialog = true)}
				class="flex-1 rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white"
			>
				Beenden
			</button>
		</div>
	</div>

	<ConfirmDialog
		open={showFinishDialog}
		title="Workout beenden?"
		message="Dauer: {formatDuration(timerStore.sessionElapsed)} — Volumen: {formatVolume(workoutStore.totalVolume)} — {completedSets}/{totalSets} Sätze"
		confirmText="Beenden"
		onconfirm={finishWorkout}
		oncancel={() => (showFinishDialog = false)}
	/>

	<ConfirmDialog
		open={showCancelDialog}
		title="Workout abbrechen?"
		message="Alle Daten dieser Einheit werden gelöscht."
		confirmText="Abbrechen"
		cancelText="Zurück"
		onconfirm={cancelWorkout}
		oncancel={() => (showCancelDialog = false)}
	/>

	<ExercisePickerModal
		open={showExercisePicker}
		excludeExerciseIds={usedExerciseIds}
		onselect={handleAddExercise}
		onclose={() => (showExercisePicker = false)}
	/>

	<PlateCalculatorSheet
		open={showPlateCalc}
		targetWeight={plateCalcWeight}
		{plateConfig}
		onclose={() => (showPlateCalc = false)}
	/>
{/if}
	</ErrorBoundary>
</div>
