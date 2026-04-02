<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { getDashboardData, type DashboardTemplate } from '$lib/application/dashboard/queries.js';
	import { getDashboardStats, type DashboardStats } from '$lib/application/statistics/queries.js';
	import { getAchievements, type Achievement } from '$lib/application/gamification/queries.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import AchievementsCard from '$lib/components/AchievementsCard.svelte';
	import { workoutStore } from '$lib/stores/workout.svelte.js';
	import { formatShortDate, formatDuration } from '$lib/services/formatter.js';
	import DashboardStatsCard from '$lib/components/DashboardStatsCard.svelte';
	import type { WorkoutSession } from '$lib/models/types.js';

	let templates = $state<DashboardTemplate[]>([]);
	let recentSessions = $state<WorkoutSession[]>([]);
	let inProgressSession = $state<WorkoutSession | null>(null);
	let lastCompletedTemplateId = $state<string | null>(null);
	let dashboardStats = $state<DashboardStats | null>(null);
	let achievements = $state<Achievement[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadDashboard();
	});

	async function loadDashboard() {
		loading = true;
		loadError = null;

		try {
			const [dashboard, stats, achievementData] = await Promise.all([
				getDashboardData(),
				getDashboardStats(),
				getAchievements()
			]);
			templates = dashboard.templates;
			recentSessions = dashboard.recentSessions;
			inProgressSession = dashboard.inProgressSession;
			lastCompletedTemplateId = dashboard.lastCompletedTemplateId;
			dashboardStats = stats;
			achievements = achievementData;
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Das Dashboard konnte nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	async function startWorkout(templateId: string) {
		const sessionId = await workoutStore.startWorkout(templateId);
		goto(`${base}/workout/${sessionId}`);
	}

	async function startCustomWorkout() {
		const sessionId = await workoutStore.startCustomWorkout();
		goto(`${base}/workout/${sessionId}`);
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
	<img src="{base}/logo.svg" alt="FitTrack" class="mx-auto h-8 dark:invert" />

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Dashboard konnte nicht geladen werden"
		onretry={loadDashboard}
	>
		{#snippet loadingContent()}
			<div class="space-y-4">
				<div class="h-24 animate-pulse rounded-2xl bg-blue-100 dark:bg-blue-950"></div>
				<div class="h-28 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="space-y-2">
					<div class="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
					<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
					<div class="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				</div>
			</div>
		{/snippet}

		<!-- In-progress workout recovery -->
		{#if inProgressSession}
			<a
				href="{base}/workout/{inProgressSession.id}"
				class="block rounded-2xl bg-blue-500 p-4 text-white"
			>
				<p class="text-sm font-medium opacity-80">Laufendes Workout</p>
				<p class="text-lg font-bold">{inProgressSession.templateName}</p>
				<p class="mt-1 text-sm font-semibold">Fortsetzen &rarr;</p>
			</a>
		{/if}

		<!-- Streak at risk warning -->
		{#if dashboardStats?.streakAtRisk && !inProgressSession}
			<div class="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
				<span class="text-xl" aria-hidden="true">⚠️</span>
				<p class="text-sm font-medium text-orange-800 dark:text-orange-200">
					Trainiere diese Woche, um deine {dashboardStats.currentStreak}-Wochen-Serie zu halten!
				</p>
			</div>
		{/if}

		<!-- Weekly stats summary -->
		{#if dashboardStats && (dashboardStats.workoutsThisWeek > 0 || dashboardStats.currentStreak > 0)}
			<DashboardStatsCard stats={dashboardStats} />
		{/if}

		<!-- Quick start -->
		<section>
			<h2 class="mb-3 text-lg font-semibold">Workout starten</h2>
			{#if templates.length === 0}
				<EmptyState
					title="Noch keine Vorlagen"
					message="Lege zuerst eine Vorlage an oder starte direkt ein freies Workout."
				>
					<button
						onclick={startCustomWorkout}
						disabled={inProgressSession !== null}
						class="mt-4 min-h-12 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
					>
						Freies Workout
					</button>
				</EmptyState>
			{:else}
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
					<button
						onclick={startCustomWorkout}
						disabled={inProgressSession !== null}
						class="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-sm font-semibold text-gray-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Freies Workout
					</button>
				</div>
			{/if}
		</section>

		<!-- Achievements -->
		{#if achievements.length > 0}
			<AchievementsCard {achievements} />
		{/if}

		<!-- Recent sessions -->
		<section>
			<h2 class="mb-3 text-lg font-semibold">Letzte Einheiten</h2>
			{#if recentSessions.length === 0}
				<EmptyState
					title="Noch keine Einheiten"
					message="Sobald du ein Workout abschließt, erscheint es hier."
					compact={true}
				/>
			{:else}
			<div class="space-y-2">
				{#each recentSessions as session}
					<a
						href="{base}/history/{session.id}"
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
	</ErrorBoundary>
</div>
