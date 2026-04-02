<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Achievement } from '$lib/application/gamification/queries.js';

	interface Props {
		achievements: Achievement[];
	}

	let { achievements }: Props = $props();
	let expanded = $state(false);

	let earnedCount = $derived(achievements.filter((a) => a.earned).length);
	let recentlyEarned = $derived(achievements.filter((a) => a.earned));
	let inProgress = $derived(
		achievements
			.filter((a) => !a.earned && a.progress > 0)
			.sort((a, b) => b.progress - a.progress)
	);
	let locked = $derived(achievements.filter((a) => !a.earned && a.progress === 0));

	let visibleAchievements = $derived(
		expanded
			? [...recentlyEarned, ...inProgress, ...locked]
			: [...recentlyEarned.slice(0, 3), ...inProgress.slice(0, 2)]
	);
	let hasMore = $derived(achievements.length > visibleAchievements.length && !expanded);
</script>

<section>
	<div class="mb-3 flex items-baseline justify-between">
		<h2 class="text-lg font-semibold">Erfolge</h2>
		<span class="text-sm text-gray-500 dark:text-gray-400">
			{earnedCount}/{achievements.length}
		</span>
	</div>
	<div class="space-y-2">
		{#each visibleAchievements as achievement (achievement.id)}
			<div
				class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-gray-900 {achievement.earned ? '' : 'opacity-70'}"
				transition:slide={{ duration: 200 }}
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
	{#if hasMore || expanded}
		<button
			onclick={() => (expanded = !expanded)}
			class="mt-2 w-full rounded-xl py-2 text-center text-sm font-medium text-blue-500"
		>
			{expanded ? 'Weniger anzeigen' : `Alle ${achievements.length} anzeigen`}
		</button>
	{/if}
</section>
