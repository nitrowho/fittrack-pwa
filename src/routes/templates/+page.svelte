<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/db/database.js';
	import type { WorkoutTemplate, TemplateExercise } from '$lib/models/types.js';

	let templates = $state<WorkoutTemplate[]>([]);
	let exerciseCounts = $state<Map<string, number>>(new Map());

	onMount(async () => {
		templates = await db.workoutTemplates.orderBy('sortOrder').toArray();
		const counts = new Map<string, number>();
		for (const t of templates) {
			const count = await db.templateExercises.where('templateId').equals(t.id).count();
			counts.set(t.id, count);
		}
		exerciseCounts = counts;
	});
</script>

<div class="space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Vorlagen</h1>
		<a
			href="/templates/new"
			class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white"
		>
			Neue Vorlage
		</a>
	</div>

	{#if templates.length === 0}
		<p class="text-sm text-gray-500">Keine Vorlagen vorhanden</p>
	{:else}
		<div class="space-y-2">
			{#each templates as template}
				<a
					href="/templates/{template.id}"
					class="block rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
				>
					<h3 class="font-semibold">{template.name}</h3>
					<p class="mt-0.5 text-xs text-gray-500">
						{exerciseCounts.get(template.id) ?? 0} Übungen
					</p>
				</a>
			{/each}
		</div>
	{/if}
</div>
