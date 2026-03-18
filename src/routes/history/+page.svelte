<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { deleteHistorySession } from '$lib/application/history/commands.js';
	import { listHistorySessions, type HistorySessionListItem } from '$lib/application/history/queries.js';
	import { formatShortDate, formatDuration, formatVolume } from '$lib/services/formatter.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let sessions = $state<HistorySessionListItem[]>([]);
	let deleteTarget = $state<string | null>(null);

	onMount(loadSessions);

	async function loadSessions() {
		sessions = await listHistorySessions();
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		await deleteHistorySession(deleteTarget);
		deleteTarget = null;
		await loadSessions();
	}
</script>

<div class="space-y-4 p-4">
	<h1 class="text-2xl font-bold">Verlauf</h1>

	{#if sessions.length === 0}
		<p class="text-sm text-gray-500">Noch keine Einheiten</p>
	{:else}
		<div class="space-y-2">
			{#each sessions as item}
				<div class="flex items-center gap-2">
					<a
						href="{base}/history/{item.session.id}"
						class="flex-1 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
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
					<button
						onclick={() => (deleteTarget = item.session.id)}
						class="rounded-xl p-2 text-red-500"
						aria-label="Löschen"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ConfirmDialog
	open={deleteTarget !== null}
	title="Einheit löschen?"
	message="Diese Einheit wird unwiderruflich gelöscht."
	confirmText="Löschen"
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
/>
