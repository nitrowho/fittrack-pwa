<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { deleteTemplate } from '$lib/application/templates/commands.js';
	import { getTemplateDetail } from '$lib/application/templates/queries.js';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { formatSetsReps, formatRestDuration } from '$lib/services/formatter.js';
	import MuscleGroupBadge from '$lib/components/MuscleGroupBadge.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import type { WorkoutTemplate } from '$lib/models/types.js';

	let template = $state<WorkoutTemplate | null>(null);
	let templateExercises = $state<Awaited<ReturnType<typeof getTemplateDetail>>['exercises']>([]);
	let showDeleteDialog = $state(false);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadTemplate();
	});

	async function loadTemplate() {
		const id = page.params.id as string;
		loading = true;
		loadError = null;

		try {
			const detail = await getTemplateDetail(id);
			template = detail.template;
			templateExercises = detail.exercises;

			if (!detail.template) {
				loadError = 'Die angeforderte Vorlage wurde nicht gefunden.';
			}
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Vorlage konnte nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	async function handleDelete() {
		if (!template) return;
		await deleteTemplate(template.id);
		goto(`${base}/templates`);
	}

	async function startWorkout() {
		if (!template) return;
		const sessionId = await workoutStore.startWorkout(template.id);
		goto(`${base}/workout/${sessionId}`);
	}
</script>

<div class="p-4">
	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Vorlage konnte nicht geladen werden"
		onretry={loadTemplate}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

	{#if template}
	<div class="space-y-4">
		<div>
			<a href="{base}/templates" class="text-sm text-blue-500">&larr; Vorlagen</a>
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
				href="{base}/templates/{template.id}/edit"
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
	</ErrorBoundary>
</div>
