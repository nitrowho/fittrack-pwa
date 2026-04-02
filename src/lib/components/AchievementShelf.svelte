<script lang="ts">
	import { base } from '$app/paths';
	import type { Achievement } from '$lib/application/gamification/queries.js';

	interface Props {
		achievements: Achievement[];
	}

	let { achievements }: Props = $props();

	let earned = $derived(achievements.filter((a) => a.earned));
	let nextUp = $derived(
		achievements
			.filter((a) => !a.earned && a.progress > 0)
			.sort((a, b) => b.progress - a.progress)[0] ?? null
	);
</script>

<a href="{base}/achievements" class="block" aria-label="Alle Erfolge anzeigen">
	<section>
		<div class="mb-3 flex items-baseline justify-between">
			<h2 class="text-lg font-semibold">Erfolge</h2>
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
				<span>{earned.length}/{achievements.length}</span>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<!-- Earned badge row -->
			<div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
				{#each earned as badge (badge.id)}
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950" title={badge.name}>
						<span class="text-base">{badge.icon}</span>
					</div>
				{/each}
				{#each { length: achievements.length - earned.length } as _, i}
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<div class="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
					</div>
				{/each}
			</div>

			<!-- Next up -->
			{#if nextUp}
				<div class="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
					<span class="text-lg grayscale">{nextUp.icon}</span>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{nextUp.name}</p>
						<div class="mt-1 flex items-center gap-2">
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
								<div
									class="h-full rounded-full bg-blue-500 transition-all"
									style:width="{Math.round(nextUp.progress * 100)}%"
								></div>
							</div>
							<span class="shrink-0 text-[10px] text-gray-400">{nextUp.progressLabel}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>
</a>
