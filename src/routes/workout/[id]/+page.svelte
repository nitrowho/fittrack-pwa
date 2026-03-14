<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getWorkoutProgressions } from '$lib/application/workouts/queries.js';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { timerStore } from '$lib/stores/timer.svelte.js';
	import { formatDuration, formatVolume, formatVolumeDelta } from '$lib/services/formatter.js';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { ProgressionResult } from '$lib/domain/workouts/progression.js';
	import type { ExerciseSet } from '$lib/models/types.js';

	let progressions = $state<Map<string, ProgressionResult>>(new Map());
	let showFinishDialog = $state(false);
	let showCancelDialog = $state(false);

	onMount(async () => {
		const id = page.params.id as string;
		if (!workoutStore.isActive || workoutStore.session?.id !== id) {
			await workoutStore.resumeWorkout(id);
		}
		if (!workoutStore.isActive) {
			goto('/');
			return;
		}
		await loadProgressions();
	});

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

	async function finishWorkout() {
		await workoutStore.finishWorkout();
		goto('/');
	}

	async function cancelWorkout() {
		await workoutStore.cancelWorkout();
		goto('/');
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

{#if workoutStore.isActive}
	<div class="space-y-4 p-4">
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
		{#each workoutStore.exerciseSessions as es}
			<ExerciseCard
				exerciseSession={es}
				sets={workoutStore.sets.get(es.id) ?? []}
				lastSession={workoutStore.lastSessionData.get(es.id) ?? null}
				progression={progressions.get(es.id) ?? { type: 'none' }}
				oncomplete={handleComplete}
				onuncomplete={handleUncomplete}
				onupdate={handleUpdate}
				onaddset={handleAddSet}
				onremoveset={handleRemoveSet}
				onapplyweight={handleApplyWeight}
			/>
		{/each}

		<!-- Action buttons -->
		<div class="flex gap-3 pt-2">
			<button
				onclick={() => (showCancelDialog = true)}
				class="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold dark:bg-gray-800"
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
{/if}
