<script lang="ts">
	import type { LastSessionData } from '$lib/application/workouts/types.js';
	import type { ProgressionResult } from '$lib/domain/workouts/progression.js';
	import type { ExerciseSession, ExerciseSet } from '$lib/models/types.js';
	import { formatWeight, formatVolume, formatVolumeDelta, formatSetsReps } from '$lib/services/formatter.js';
	import MuscleGroupBadge from './MuscleGroupBadge.svelte';
	import SetRow from './SetRow.svelte';
	import RestTimer from './RestTimer.svelte';

	interface Props {
		exerciseSession: ExerciseSession;
		sets: ExerciseSet[];
		lastSession: LastSessionData | null;
		progression: ProgressionResult;
		oncomplete: (setId: string, weight: number, reps: number) => void;
		onuncomplete: (setId: string) => void;
		onupdate: (setId: string, changes: Partial<ExerciseSet>) => void;
		onaddset: (exerciseSessionId: string) => void;
		onremoveset: (exerciseSessionId: string) => void;
		onapplyweight: (exerciseSessionId: string, weight: number) => void;
	}

	let {
		exerciseSession,
		sets,
		lastSession,
		progression,
		oncomplete,
		onuncomplete,
		onupdate,
		onaddset,
		onremoveset,
		onapplyweight
	}: Props = $props();

	let expanded = $state(true);

	let completedCount = $derived(sets.filter((s) => s.isCompleted).length);
	let volume = $derived(
		sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0)
	);
	let lastVolume = $derived(
		lastSession?.sets.filter((s) => s.isCompleted).reduce((sum, s) => sum + s.weight * s.reps, 0) ?? 0
	);
	let delta = $derived(lastVolume > 0 ? volume - lastVolume : 0);

	let lastRepsSummary = $derived(
		lastSession?.sets
			.filter((s) => s.isCompleted)
			.map((s) => s.reps)
			.join('/') ?? ''
	);
	let lastWeight = $derived(
		lastSession?.sets.find((s) => s.isCompleted)?.weight
	);
</script>

<div class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
	<!-- Header -->
	<button
		onclick={() => (expanded = !expanded)}
		class="flex w-full items-center gap-3 p-4"
	>
		<div class="flex-1 text-left">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold">{exerciseSession.exerciseName}</h3>
				<MuscleGroupBadge muscleGroup={exerciseSession.muscleGroup} />
			</div>
			<p class="mt-0.5 text-xs text-gray-500">
				{completedCount}/{sets.length} Sätze
				&middot; {formatSetsReps(exerciseSession.targetSets, exerciseSession.repRangeLower, exerciseSession.repRangeUpper)}
			</p>
		</div>
		<svg
			class="h-5 w-5 text-gray-400 transition-transform {expanded ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if expanded}
		<div class="space-y-2 px-4 pb-4">
			<!-- Progression banner -->
			{#if progression.type === 'increase'}
				<button
					onclick={() => onapplyweight(exerciseSession.id, progression.newWeight)}
					class="w-full rounded-xl bg-green-50 px-3 py-2 text-left text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
				>
					Gewicht erhöhen auf {formatWeight(progression.newWeight)}
				</button>
			{:else if progression.type === 'stagnation'}
				<div class="rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
					Seit {progression.sessionCount} Einheiten keine Steigerung
				</div>
			{/if}

			<!-- Last session comparison -->
			{#if lastSession && lastWeight !== undefined}
				<p class="text-xs text-gray-500">
					Letztes Mal: {formatWeight(lastWeight)} &mdash; {lastRepsSummary}
					{#if delta !== 0}
						<span class={delta > 0 ? 'text-green-600' : 'text-red-500'}>
							({formatVolumeDelta(delta)})
						</span>
					{/if}
				</p>
			{/if}

			<!-- Rest timer -->
			<RestTimer exerciseSessionId={exerciseSession.id} />

			<!-- Sets -->
			<div class="space-y-1">
				{#each sets as set, i}
					<SetRow
						{set}
						lastSet={lastSession?.sets[i] ?? null}
						{oncomplete}
						{onuncomplete}
						{onupdate}
					/>
				{/each}
			</div>

			<!-- Add/remove set buttons -->
			<div class="flex gap-2 pt-1">
				<button
					onclick={() => onaddset(exerciseSession.id)}
					class="flex-1 rounded-lg bg-gray-100 py-1.5 text-xs font-medium dark:bg-gray-800"
				>
					+ Satz
				</button>
				{#if sets.length > 1}
					<button
						onclick={() => onremoveset(exerciseSession.id)}
						class="flex-1 rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-red-500 dark:bg-gray-800"
					>
						&minus; Satz
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
