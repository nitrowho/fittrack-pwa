<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { db } from '$lib/db/database.js';
	import { formatDate, formatDuration, formatVolume, formatVolumeDelta, formatWeight } from '$lib/services/formatter.js';
	import MuscleGroupBadge from '$lib/components/MuscleGroupBadge.svelte';
	import type { WorkoutSession, ExerciseSession, ExerciseSet } from '$lib/models/types.js';

	let session = $state<WorkoutSession | null>(null);
	let exerciseSessions = $state<ExerciseSession[]>([]);
	let setsMap = $state<Map<string, ExerciseSet[]>>(new Map());
	let totalVolume = $state(0);
	let duration = $state(0);

	onMount(async () => {
		const id = page.params.id as string;
		session = (await db.workoutSessions.get(id)) ?? null;
		if (!session) return;

		exerciseSessions = await db.exerciseSessions
			.where('workoutSessionId')
			.equals(id)
			.sortBy('sortOrder');

		let vol = 0;
		const map = new Map<string, ExerciseSet[]>();
		for (const es of exerciseSessions) {
			const sets = await db.exerciseSets
				.where('exerciseSessionId')
				.equals(es.id)
				.sortBy('setNumber');
			map.set(es.id, sets);
			for (const set of sets) {
				if (set.isCompleted) vol += set.weight * set.reps;
			}
		}
		setsMap = map;
		totalVolume = vol;

		if (session.completedAt) {
			duration = (session.completedAt.getTime() - session.startedAt.getTime()) / 1000;
		}
	});
</script>

{#if session}
	<div class="space-y-4 p-4">
		<div>
			<a href="/history" class="text-sm text-blue-500">&larr; Verlauf</a>
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

		{#each exerciseSessions as es}
			{@const sets = setsMap.get(es.id) ?? []}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<div class="flex items-center gap-2">
					<h3 class="font-semibold">{es.exerciseName}</h3>
					<MuscleGroupBadge muscleGroup={es.muscleGroup} />
				</div>
				<div class="mt-2 space-y-1">
					{#each sets as set}
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
