<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { deleteHistorySession } from '$lib/application/history/commands.js';
	import {
		getCalendarMonthData,
		listHistorySessions,
		type CalendarDayData,
		type HistorySessionListItem
	} from '$lib/application/history/queries.js';
	import { toDateKey } from '$lib/application/history/calendar.js';
	import { formatShortDate, formatDuration, formatVolume } from '$lib/services/formatter.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import TrainingCalendar from '$lib/components/TrainingCalendar.svelte';

	type TabView = 'history' | 'stats';

	let activeTab = $state<TabView>(
		page.url.searchParams.get('tab') === 'stats' ? 'stats' : 'history'
	);

	let sessions = $state<HistorySessionListItem[]>([]);
	let editing = $state(false);
	let selected = $state<Set<string>>(new Set());
	let showDeleteDialog = $state(false);

	let calendarYear = $state(new Date().getFullYear());
	let calendarMonth = $state(new Date().getMonth());
	let trainingDays = $state<Map<string, CalendarDayData>>(new Map());
	let selectedDate = $state<string | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	let displayedSessions = $derived(
		selectedDate
			? sessions.filter((s) => toDateKey(s.session.startedAt) === selectedDate)
			: sessions
	);

	onMount(loadData);

	async function loadData() {
		loading = true;
		loadError = null;

		try {
			await Promise.all([loadSessions(), loadCalendar()]);
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Der Verlauf konnte nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	async function loadSessions() {
		sessions = await listHistorySessions();
	}

	async function loadCalendar() {
		trainingDays = await getCalendarMonthData(calendarYear, calendarMonth);
	}

	function handleNavigate(year: number, month: number) {
		calendarYear = year;
		calendarMonth = month;
		selectedDate = null;
		loadCalendar();
	}

	function handleSelectDate(dateKey: string | null) {
		selectedDate = dateKey;
	}

	function toggleEditing() {
		editing = !editing;
		selected = new Set();
	}

	function toggleSelect(id: string) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}

	function toggleSelectAll() {
		if (selected.size === displayedSessions.length) {
			selected = new Set();
		} else {
			selected = new Set(displayedSessions.map((s) => s.session.id));
		}
	}

	async function confirmDelete() {
		for (const id of selected) {
			await deleteHistorySession(id);
		}
		showDeleteDialog = false;
		selected = new Set();
		editing = false;
		await loadData();
	}
</script>

<div class="space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Verlauf</h1>
		{#if activeTab === 'history' && sessions.length > 0}
			<button
				onclick={toggleEditing}
				class="text-sm font-medium text-blue-500"
			>
				{editing ? 'Fertig' : 'Bearbeiten'}
			</button>
		{/if}
	</div>

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Verlauf konnte nicht geladen werden"
		onretry={loadData}
	>
		{#snippet loadingContent()}
			<div class="space-y-4">
				<div class="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
				<div class="h-72 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

		<!-- Segmented control -->
		<div class="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
			<button
				onclick={() => { activeTab = 'history'; editing = false; }}
				aria-pressed={activeTab === 'history'}
				class="flex min-h-12 flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activeTab === 'history'
					? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				Verlauf
			</button>
			<button
				onclick={() => { activeTab = 'stats'; editing = false; }}
				aria-pressed={activeTab === 'stats'}
				class="flex min-h-12 flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activeTab === 'stats'
					? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				Statistiken
			</button>
		</div>

		{#key activeTab}
			<div transition:fade={{ duration: 160 }}>
			{#if activeTab === 'stats'}
				{#await import('$lib/components/statistics/StatsOverview.svelte') then { default: StatsOverview }}
					<StatsOverview />
				{/await}
			{:else}

			{#if !editing}
				<TrainingCalendar
					year={calendarYear}
					month={calendarMonth}
					{trainingDays}
					{selectedDate}
					onselect={handleSelectDate}
					onnavigate={handleNavigate}
				/>
			{/if}

			{#if selectedDate}
				<button
					onclick={() => (selectedDate = null)}
					class="inline-flex min-h-12 items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
				>
					Alle anzeigen
					<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}

			{#if sessions.length === 0}
				<EmptyState
					title="Noch keine Einheiten"
					message="Deine abgeschlossenen Workouts und Statistiken erscheinen hier."
				/>
			{:else}
				{#if editing}
					<div class="flex items-center justify-between text-sm">
						<button onclick={toggleSelectAll} class="font-medium text-blue-500">
							{selected.size === displayedSessions.length ? 'Keine auswählen' : 'Alle auswählen'}
						</button>
						<span class="text-gray-500">
							{selected.size} ausgewählt
						</span>
					</div>
				{/if}

				{#if displayedSessions.length === 0 && selectedDate}
					<EmptyState
						title="Keine Einheiten an diesem Tag"
						message="Wähle einen anderen Tag oder zeige wieder alle Einheiten an."
						compact={true}
					/>
				{:else}
					<div class="space-y-2">
						{#each displayedSessions as item}
							{#if editing}
								<button
									onclick={() => toggleSelect(item.session.id)}
									class="flex w-full items-center gap-3 text-left"
								>
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 {selected.has(item.session.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}">
										{#if selected.has(item.session.id)}
											<svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</div>
									<div class="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
										<div class="flex items-center justify-between">
											<h3 class="font-medium">{item.session.templateName}</h3>
											<span class="text-xs text-gray-500">{formatShortDate(item.session.startedAt)}</span>
										</div>
										<div class="mt-1 flex gap-3 text-xs text-gray-500">
											{#if item.session.completedAt}
												<span>{formatDuration((item.session.completedAt.getTime() - item.session.startedAt.getTime()) / 1000)}</span>
											{/if}
											<span>{formatVolume(item.volume)}</span>
										</div>
									</div>
								</button>
							{:else}
								<a
									href="{base}/history/{item.session.id}"
									class="block rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
								>
									<div class="flex items-center justify-between">
										<h3 class="font-medium">{item.session.templateName}</h3>
										<span class="text-xs text-gray-500">{formatShortDate(item.session.startedAt)}</span>
									</div>
									<div class="mt-1 flex gap-3 text-xs text-gray-500">
										{#if item.session.completedAt}
											<span>{formatDuration((item.session.completedAt.getTime() - item.session.startedAt.getTime()) / 1000)}</span>
										{/if}
										<span>{formatVolume(item.volume)}</span>
									</div>
								</a>
							{/if}
						{/each}
					</div>
				{/if}
			{/if}
			{/if}
			</div>
		{/key}
	</ErrorBoundary>
</div>

{#if editing && selected.size > 0}
	<div class="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
		<button
			onclick={() => (showDeleteDialog = true)}
			class="flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
			{selected.size} {selected.size === 1 ? 'Einheit' : 'Einheiten'} löschen
		</button>
	</div>
{/if}

<ConfirmDialog
	open={showDeleteDialog}
	title="{selected.size} {selected.size === 1 ? 'Einheit' : 'Einheiten'} löschen?"
	message="Die ausgewählten Einheiten werden unwiderruflich gelöscht."
	confirmText="Löschen"
	onconfirm={confirmDelete}
	oncancel={() => (showDeleteDialog = false)}
/>
