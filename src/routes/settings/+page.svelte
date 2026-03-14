<script lang="ts">
	import {
		downloadBackupFile,
		downloadCsvExport,
		downloadJsonExport,
		restoreBackupFile
	} from '$lib/application/settings/commands.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let showRestoreDialog = $state(false);
	let selectedFile = $state<File | null>(null);
	let statusMessage = $state('');

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		selectedFile = input.files?.[0] ?? null;
		if (selectedFile) {
			showRestoreDialog = true;
		}
	}

	async function handleBackup() {
		try {
			await downloadBackupFile();
			statusMessage = 'Backup erstellt';
		} catch {
			statusMessage = 'Fehler beim Erstellen des Backups';
		}
		setTimeout(() => (statusMessage = ''), 3000);
	}

	async function handleRestore() {
		if (!selectedFile) return;
		try {
			await restoreBackupFile(selectedFile);
			statusMessage = 'Backup wiederhergestellt';
			showRestoreDialog = false;
			selectedFile = null;
		} catch (e) {
			statusMessage = `Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`;
			showRestoreDialog = false;
		}
		setTimeout(() => (statusMessage = ''), 3000);
	}

	async function handleExportCSV() {
		await downloadCsvExport();
	}

	async function handleExportJSON() {
		await downloadJsonExport();
	}
</script>

<div class="space-y-6 p-4">
	<h1 class="text-2xl font-bold">Einstellungen</h1>

	{#if statusMessage}
		<div class="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
			{statusMessage}
		</div>
	{/if}

	<!-- Backup -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Backup</h2>
		<button
			onclick={handleBackup}
			class="w-full rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-gray-900"
		>
			<h3 class="font-medium">Backup erstellen</h3>
			<p class="mt-0.5 text-xs text-gray-500">Alle Daten als JSON-Datei exportieren</p>
		</button>
		<label class="block w-full cursor-pointer rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<h3 class="font-medium">Backup wiederherstellen</h3>
			<p class="mt-0.5 text-xs text-gray-500">JSON-Backup importieren (ersetzt alle Daten)</p>
			<input type="file" accept=".json" onchange={handleFileSelect} class="hidden" />
		</label>
	</section>

	<!-- Export -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Daten exportieren</h2>
		<button
			onclick={handleExportCSV}
			class="w-full rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-gray-900"
		>
			<h3 class="font-medium">CSV exportieren</h3>
			<p class="mt-0.5 text-xs text-gray-500">Abgeschlossene Einheiten als CSV-Datei</p>
		</button>
		<button
			onclick={handleExportJSON}
			class="w-full rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-gray-900"
		>
			<h3 class="font-medium">JSON exportieren</h3>
			<p class="mt-0.5 text-xs text-gray-500">Abgeschlossene Einheiten als JSON-Datei</p>
		</button>
	</section>

	<!-- About -->
	<section>
		<p class="text-center text-xs text-gray-400">FitTrack PWA v0.0.1</p>
	</section>
</div>

<ConfirmDialog
	open={showRestoreDialog}
	title="Backup wiederherstellen?"
	message="Alle aktuellen Daten werden durch das Backup ersetzt. Diese Aktion kann nicht rückgängig gemacht werden."
	confirmText="Wiederherstellen"
	onconfirm={handleRestore}
	oncancel={() => { showRestoreDialog = false; selectedFile = null; }}
/>
