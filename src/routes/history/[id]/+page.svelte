<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import {
		getHistorySessionDetail,
		type HistoryExerciseSessionDetail
	} from '$lib/application/history/queries.js';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import { formatDate, formatDuration, formatVolume, formatWeight } from '$lib/services/formatter.js';
	import MuscleGroupBadge from '$lib/components/MuscleGroupBadge.svelte';
	import type { WorkoutSession } from '$lib/models/types.js';

	let session = $state<WorkoutSession | null>(null);
	let exerciseSessions = $state<HistoryExerciseSessionDetail[]>([]);
	let totalVolume = $state(0);
	let duration = $state(0);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadHistoryDetail();
	});

	async function loadHistoryDetail() {
		const id = page.params.id as string;
		loading = true;
		loadError = null;

		try {
			const detail = await getHistorySessionDetail(id);
			if (!detail) {
				loadError = 'Die angeforderte Einheit wurde nicht gefunden.';
				return;
			}

			session = detail.session;
			exerciseSessions = detail.exerciseSessions;
			totalVolume = detail.totalVolume;
			duration = detail.duration;
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Einheit konnte nicht geladen werden.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="p-4">
	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Einheit konnte nicht geladen werden"
		onretry={loadHistoryDetail}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

	{#if session}
	<div class="space-y-4">
		<div>
			<a href="{base}/history" class="text-sm text-blue-500">&larr; Verlauf</a>
			<h1 class="mt-1 text-2xl font-bold">{session.templateName}</h1>
			<p class="text-sm text-gray-500">{formatDate(session.startedAt)}</p>
		</div>

		<div class="flex gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<div>
				<p class="text-xs text-gray-500">Dauer</p>
				<p class="font-semibold">{formatDuration(duration)}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Volumen</p>
				<p class="font-semibold">{formatVolume(totalVolume)}</p>
			</div>
		</div>

		{#each exerciseSessions as entry}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<div class="flex items-center gap-2">
					<h3 class="font-semibold">{entry.exerciseSession.exerciseName}</h3>
					<MuscleGroupBadge muscleGroup={entry.exerciseSession.muscleGroup} />
				</div>
				<div class="mt-2 space-y-1">
					{#each entry.sets as set}
						{#if set.isCompleted}
							<div class="flex gap-3 text-sm">
								<span class="w-6 text-gray-400">{set.setNumber}.</span>
								<span>{formatWeight(set.weight)}</span>
								<span>&times; {set.reps}</span>
								{#if set.rir !== null}
									<span class="text-gray-400">RIR {set.rir}</span>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}

		{#if session.notes}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<h3 class="mb-1 text-sm font-semibold text-gray-500">Notizen</h3>
				<p class="text-sm">{session.notes}</p>
			</div>
		{/if}
	</div>
	{/if}
	</ErrorBoundary>
</div>
