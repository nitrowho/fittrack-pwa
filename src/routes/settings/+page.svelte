<script lang="ts">
	import { onMount } from 'svelte';
	import {
		downloadBackupFile,
		downloadCsvExport,
		downloadJsonExport,
		restoreBackupFile,
		savePlateConfig
	} from '$lib/application/settings/commands.js';
	import { getPlateConfig } from '$lib/application/settings/queries.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { appStore } from '$lib/stores/app.svelte.js';
	import type { PlateConfig, PlateDefinition } from '$lib/models/types.js';
	import { formatWeightPrecise } from '$lib/services/formatter.js';

	let showRestoreDialog = $state(false);
	let selectedFile = $state<File | null>(null);
	let statusMessage = $state('');

	let plateBarWeight = $state(20);
	let plateDefs = $state<PlateDefinition[]>([]);
	let newPlateWeight = $state('');
	let plateConfigLoaded = $state(false);
	let plateExpanded = $state(false);
	let plateSaveMessage = $state('');

	onMount(async () => {
		const config = await getPlateConfig();
		plateBarWeight = config.barWeight;
		plateDefs = config.plates.map((p) => ({ ...p }));
		plateConfigLoaded = true;
	});

	async function handleSavePlateConfig() {
		const config: PlateConfig = $state.snapshot({
			barWeight: plateBarWeight,
			plates: [...plateDefs].sort((a, b) => b.weight - a.weight)
		});
		await savePlateConfig(config);
		plateDefs = config.plates;
		plateSaveMessage = 'Gespeichert';
		setTimeout(() => (plateSaveMessage = ''), 2000);
	}

	function handleAddPlate() {
		const w = parseFloat(newPlateWeight.replace(',', '.'));
		if (!w || w <= 0) return;
		if (plateDefs.some((p) => p.weight === w)) return;
		plateDefs = [...plateDefs, { weight: w }].sort((a, b) => b.weight - a.weight);
		newPlateWeight = '';
	}

	function handleRemovePlate(weight: number) {
		plateDefs = plateDefs.filter((p) => p.weight !== weight);
	}

	function handlePlateQuantityChange(weight: number, value: string) {
		const qty = parseInt(value);
		plateDefs = plateDefs.map((p) =>
			p.weight === weight
				? { ...p, quantity: isNaN(qty) || qty <= 0 ? undefined : qty }
				: p
		);
	}

	type StorageStatusCopy = {
		title: string;
		description: string;
		classes: string;
	};

	function getStorageStatusCopy(): StorageStatusCopy {
		switch (appStore.storagePersistence.status) {
			case 'granted':
				return {
					title: 'Dauerhafte Speicherung aktiv',
					description:
						'Dieses Geraet hat bestätigt, dass lokale App-Daten nicht automatisch durch Speicherbereinigung entfernt werden.',
					classes:
						'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
				};
			case 'best-effort':
				return {
					title: 'Dauerhafte Speicherung nicht bestätigt',
					description:
						'Die Daten bleiben lokal gespeichert, können auf dem iPhone aber unter Umständen durch den Browser entfernt werden. Ein Backup ist empfohlen.',
					classes: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
				};
			case 'unsupported':
				return {
					title: 'Dauerhafte Speicherung nicht verfuegbar',
					description:
						'Dieser Browser unterstuetzt keine bestätigte Dauer-Speicherung. Die Daten liegen weiterhin lokal im Browser.',
					classes: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
				};
			default:
				return {
					title: 'Speicherstatus wird geprüft',
					description:
						'Die App prüft, ob der Browser dauerhafte Speicherung fuer lokale Daten erlaubt.',
					classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
				};
		}
	}

	let storageStatus = $derived(getStorageStatusCopy());

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

	<!-- Hantelscheiben -->
	{#if plateConfigLoaded}
		<section class="space-y-3">
			<div class="rounded-2xl bg-white shadow-sm dark:bg-gray-900">
				<button
					onclick={() => (plateExpanded = !plateExpanded)}
					class="flex w-full items-center justify-between p-4"
				>
					<h2 class="text-lg font-semibold">Hantelscheiben</h2>
					<svg
						class="h-5 w-5 text-gray-400 transition-transform {plateExpanded ? 'rotate-180' : ''}"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if plateExpanded}
					<div class="space-y-4 px-4 pb-4">
						<label class="block">
							<span class="text-sm font-medium">Stangengewicht (kg)</span>
							<input
								type="number"
								step="0.5"
								inputmode="decimal"
								bind:value={plateBarWeight}
								class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
							/>
						</label>

						<div>
							<h4 class="mb-2 text-sm font-medium">Verfügbare Scheiben</h4>
							<div class="space-y-2">
								{#each plateDefs as plate}
									<div class="flex items-center gap-2">
										<span class="w-20 text-sm font-medium">{formatWeightPrecise(plate.weight)}</span>
										<input
											type="number"
											inputmode="numeric"
											placeholder="∞"
											value={plate.quantity ?? ''}
											onchange={(e: Event) => handlePlateQuantityChange(plate.weight, (e.target as HTMLInputElement).value)}
											class="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm dark:border-gray-700 dark:bg-gray-800"
											aria-label="Anzahl {formatWeightPrecise(plate.weight)} Scheiben"
										/>
										<span class="text-xs text-gray-400">Stk.</span>
										<button
											onclick={() => handleRemovePlate(plate.weight)}
											class="ml-auto p-1 text-red-500"
											aria-label="Scheibe entfernen"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>

							<div class="mt-3 flex gap-2">
								<input
									type="text"
									inputmode="decimal"
									placeholder="Neue Scheibe (kg)"
									bind:value={newPlateWeight}
									onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleAddPlate(); }}
									class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
								/>
								<button
									onclick={handleAddPlate}
									class="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium dark:bg-gray-800"
								>
									Hinzufügen
								</button>
							</div>
						</div>

						<button
							onclick={handleSavePlateConfig}
							class="w-full rounded-xl bg-blue-500 py-2 text-sm font-medium text-white"
						>
							{plateSaveMessage || 'Speichern'}
						</button>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Backup -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Backup</h2>
		<div class={`rounded-2xl p-4 text-sm ${storageStatus.classes}`}>
			<h3 class="font-medium">{storageStatus.title}</h3>
			<p class="mt-1 text-xs opacity-80">{storageStatus.description}</p>
		</div>
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
		<p class="text-center text-xs text-gray-400">FitTrack PWA v0.1.0</p>
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
