<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getGamificationData, type Achievement } from '$lib/application/gamification/queries.js';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

	let achievements = $state<Achievement[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	let earned = $derived(achievements.filter((a) => a.earned));
	let inProgress = $derived(
		achievements
			.filter((a) => !a.earned && a.progress > 0)
			.sort((a, b) => b.progress - a.progress)
	);
	let locked = $derived(achievements.filter((a) => !a.earned && a.progress === 0));
	let sorted = $derived([...earned, ...inProgress, ...locked]);

	onMount(() => {
		void loadData();
	});

	async function loadData() {
		loading = true;
		loadError = null;
		try {
			const data = await getGamificationData();
			achievements = data.achievements;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Erfolge konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6 p-4">
	<!-- Header with back button -->
	<div class="flex items-center gap-3">
		<a
			href="{base}/"
			class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-900"
			aria-label="Zurück"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-xl font-bold">Erfolge</h1>
			{#if !loading && !loadError}
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{earned.length} von {achievements.length} freigeschaltet
				</p>
			{/if}
		</div>
	</div>

	<ErrorBoundary
		{loading}
		error={loadError}
		title="Erfolge konnten nicht geladen werden"
		onretry={loadData}
	>
		{#snippet loadingContent()}
			<div class="space-y-2">
				{#each { length: 5 } as _}
					<div class="h-16 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				{/each}
			</div>
		{/snippet}

		<div class="space-y-2">
			{#each sorted as achievement (achievement.id)}
				<div
					class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900 {achievement.earned ? '' : 'opacity-70'}"
				>
					<span class="text-2xl {achievement.earned ? '' : 'grayscale'}" aria-hidden="true">
						{achievement.icon}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold {achievement.earned ? '' : 'text-gray-500 dark:text-gray-400'}">
								{achievement.name}
							</span>
							{#if achievement.earned}
								<svg class="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
							{/if}
						</div>
						<p class="text-xs text-gray-500 dark:text-gray-400">{achievement.description}</p>
						{#if !achievement.earned}
							<div class="mt-1.5 flex items-center gap-2">
								<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
									<div
										class="h-full rounded-full bg-blue-500 transition-all"
										style:width="{Math.round(achievement.progress * 100)}%"
									></div>
								</div>
								<span class="shrink-0 text-[10px] text-gray-400">{achievement.progressLabel}</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</ErrorBoundary>
</div>
