<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getDashboardData, type DashboardTemplate } from '$lib/application/dashboard/queries.js';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { formatShortDate, formatDuration } from '$lib/services/formatter.js';
	import type { WorkoutSession } from '$lib/models/types.js';

	let templates = $state<DashboardTemplate[]>([]);
	let recentSessions = $state<WorkoutSession[]>([]);
	let inProgressSession = $state<WorkoutSession | null>(null);
	let lastCompletedTemplateId = $state<string | null>(null);

	onMount(async () => {
		const dashboard = await getDashboardData();
		templates = dashboard.templates;
		recentSessions = dashboard.recentSessions;
		inProgressSession = dashboard.inProgressSession;
		lastCompletedTemplateId = dashboard.lastCompletedTemplateId;
	});

	async function startWorkout(templateId: string) {
		const sessionId = await workoutStore.startWorkout(templateId);
		goto(`/workout/${sessionId}`);
	}

	function getSuggestedTemplateId(): string | null {
		if (templates.length === 0) return null;
		if (!lastCompletedTemplateId) return templates[0].id;
		const lastIndex = templates.findIndex((t) => t.id === lastCompletedTemplateId);
		return templates[(lastIndex + 1) % templates.length]?.id ?? templates[0].id;
	}

	let suggestedId = $derived(getSuggestedTemplateId());
</script>

<div class="space-y-6 p-4">
	<h1 class="text-2xl font-bold">FitTrack</h1>

	<!-- In-progress workout recovery -->
	{#if inProgressSession}
		<a
			href="/workout/{inProgressSession.id}"
			class="block rounded-2xl bg-blue-500 p-4 text-white"
		>
			<p class="text-sm font-medium opacity-80">Laufendes Workout</p>
			<p class="text-lg font-bold">{inProgressSession.templateName}</p>
			<p class="mt-1 text-sm font-semibold">Fortsetzen &rarr;</p>
		</a>
	{/if}

	<!-- Quick start -->
	<section>
			<h2 class="mb-3 text-lg font-semibold">Workout starten</h2>
			<div class="space-y-3">
				{#each templates as template}
					<button
						onclick={() => startWorkout(template.id)}
						disabled={inProgressSession !== null}
					class="w-full rounded-2xl bg-white p-4 text-left shadow-sm disabled:opacity-50 dark:bg-gray-900 {suggestedId === template.id && !inProgressSession
						? 'ring-2 ring-blue-500'
						: ''}"
				>
					<div class="flex items-center justify-between">
						<h3 class="font-semibold">{template.name}</h3>
						{#if suggestedId === template.id && !inProgressSession}
							<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
								Empfohlen
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-gray-500">
						{template.exerciseNames.join(', ')}
					</p>
				</button>
			{/each}
		</div>
	</section>

	<!-- Recent sessions -->
	<section>
		<h2 class="mb-3 text-lg font-semibold">Letzte Einheiten</h2>
		{#if recentSessions.length === 0}
			<p class="text-sm text-gray-500">Noch keine Einheiten</p>
		{:else}
			<div class="space-y-2">
				{#each recentSessions as session}
					<a
						href="/history/{session.id}"
						class="block rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
					>
						<div class="flex items-center justify-between">
							<h3 class="font-medium">{session.templateName}</h3>
							<span class="text-xs text-gray-500">{formatShortDate(session.startedAt)}</span>
						</div>
						{#if session.completedAt}
							<p class="mt-1 text-xs text-gray-500">
								{formatDuration((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)}
							</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</section>
</div>
