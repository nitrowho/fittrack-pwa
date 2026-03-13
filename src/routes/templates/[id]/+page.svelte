<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { db, deleteWorkoutTemplate } from '$lib/db/database.js';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { formatSetsReps, formatRestDuration } from '$lib/services/formatter.js';
	import MuscleGroupBadge from '$lib/components/MuscleGroupBadge.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { WorkoutTemplate, TemplateExercise, Exercise } from '$lib/models/types.js';

	let template = $state<WorkoutTemplate | null>(null);
	let templateExercises = $state<(TemplateExercise & { exercise: Exercise | null })[]>([]);
	let showDeleteDialog = $state(false);

	onMount(async () => {
		const id = page.params.id as string;
		template = (await db.workoutTemplates.get(id)) ?? null;
		if (!template) return;

		const tes = await db.templateExercises.where('templateId').equals(id).sortBy('sortOrder');
		const exercises = await db.exercises.toArray();
		const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

		templateExercises = tes.map((te) => ({
			...te,
			exercise: exerciseMap.get(te.exerciseId) ?? null
		}));
	});

	async function handleDelete() {
		if (!template) return;
		await deleteWorkoutTemplate(template.id);
		goto('/templates');
	}

	async function startWorkout() {
		if (!template) return;
		const sessionId = await workoutStore.startWorkout(template.id);
		goto(`/workout/${sessionId}`);
	}
</script>

{#if template}
	<div class="space-y-4 p-4">
		<div>
			<a href="/templates" class="text-sm text-blue-500">&larr; Vorlagen</a>
			<h1 class="mt-1 text-2xl font-bold">{template.name}</h1>
		</div>

		<div class="space-y-2">
			{#each templateExercises as te}
				<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
					<div class="flex items-center gap-2">
						<h3 class="font-medium">{te.exercise?.name ?? 'Unknown'}</h3>
						<MuscleGroupBadge muscleGroup={te.exercise?.muscleGroup ?? null} />
					</div>
					<p class="mt-1 text-sm text-gray-500">
						{formatSetsReps(te.targetSets, te.repRangeLower, te.repRangeUpper)}
						&middot; Pause: {formatRestDuration(te.restDurationSeconds)}
					</p>
				</div>
			{/each}
		</div>

		<div class="flex gap-3 pt-2">
			<a
				href="/templates/{template.id}/edit"
				class="flex-1 rounded-2xl bg-gray-100 py-3 text-center text-sm font-semibold dark:bg-gray-800"
			>
				Bearbeiten
			</a>
			<button
				onclick={startWorkout}
				class="flex-1 rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white"
			>
				Workout starten
			</button>
		</div>

		<button
			onclick={() => (showDeleteDialog = true)}
			class="w-full rounded-2xl py-3 text-center text-sm font-medium text-red-500"
		>
			Vorlage löschen
		</button>
	</div>

	<ConfirmDialog
		open={showDeleteDialog}
		title="Vorlage löschen?"
		message={'Die Vorlage "' + template.name + '" wird gelöscht. Bestehende Einheiten bleiben erhalten.'}
		confirmText="Löschen"
		onconfirm={handleDelete}
		oncancel={() => (showDeleteDialog = false)}
	/>
{/if}
