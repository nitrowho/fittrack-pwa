<script lang="ts">
	import { onMount } from 'svelte';
	import {
		downloadBackupFile,
		downloadCsvExport,
		downloadJsonExport,
		restoreBackupFile,
		savePlateConfig,
		saveTheme
	} from '$lib/application/settings/commands.js';
	import { getPlateConfig, getTheme } from '$lib/application/settings/queries.js';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import type { ThemePreference } from '$lib/repositories/settings-repository.js';
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

	let currentTheme = $state<ThemePreference>('system');
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	onMount(() => {
		void loadSettings();
	});

	async function loadSettings() {
		loading = true;
		loadError = null;

		try {
			const [config, theme] = await Promise.all([getPlateConfig(), getTheme()]);
			plateBarWeight = config.barWeight;
			plateDefs = config.plates.map((p) => ({ ...p }));
			plateConfigLoaded = true;
			currentTheme = theme;
		} catch (error) {
			loadError =
				error instanceof Error ? error.message : 'Die Einstellungen konnten nicht geladen werden.';
		} finally {
			loading = false;
		}
	}

	async function handleThemeChange(theme: ThemePreference) {
		currentTheme = theme;
		await saveTheme(theme);
	}

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

	<ErrorBoundary
		loading={loading}
		error={loadError}
		title="Einstellungen konnten nicht geladen werden"
		onretry={loadSettings}
	>
		{#snippet loadingContent()}
			<div class="space-y-3">
				<div class="h-28 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
				<div class="h-24 animate-pulse rounded-2xl bg-white dark:bg-gray-900"></div>
			</div>
		{/snippet}

		{#if statusMessage}
			<div class="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
				{statusMessage}
			</div>
		{/if}

		<!-- Design -->
		<section class="space-y-3">
			<h2 class="text-lg font-semibold">Design</h2>
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<h3 class="mb-3 text-sm font-medium">Erscheinungsbild</h3>
				<div class="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
					<button
						onclick={() => handleThemeChange('system')}
						aria-pressed={currentTheme === 'system'}
						aria-label="Systemdesign verwenden"
						class="flex min-h-12 flex-1 items-center justify-center rounded-lg py-2 text-center text-sm font-medium transition-colors {currentTheme === 'system'
							? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
							: 'text-gray-500 dark:text-gray-400'}"
					>
						System
					</button>
					<button
						onclick={() => handleThemeChange('light')}
						aria-pressed={currentTheme === 'light'}
						aria-label="Helles Design verwenden"
						class="flex min-h-12 flex-1 items-center justify-center rounded-lg py-2 text-center text-sm font-medium transition-colors {currentTheme === 'light'
							? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
							: 'text-gray-500 dark:text-gray-400'}"
					>
						Hell
					</button>
					<button
						onclick={() => handleThemeChange('dark')}
						aria-pressed={currentTheme === 'dark'}
						aria-label="Dunkles Design verwenden"
						class="flex min-h-12 flex-1 items-center justify-center rounded-lg py-2 text-center text-sm font-medium transition-colors {currentTheme === 'dark'
							? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
							: 'text-gray-500 dark:text-gray-400'}"
					>
						Dunkel
					</button>
				</div>
			</div>
		</section>

		<!-- Hantelscheiben -->
		{#if plateConfigLoaded}
			<section class="space-y-3">
				<h2 class="text-lg font-semibold">Hantelscheiben</h2>
				<div class="rounded-2xl bg-white shadow-sm dark:bg-gray-900">
					<button
						onclick={() => (plateExpanded = !plateExpanded)}
						class="flex w-full items-center justify-between p-4"
					>
						<div>
							<h3 class="text-sm font-medium">Scheiben konfigurieren</h3>
							<p class="mt-0.5 text-xs text-gray-500">Stange: {formatWeightPrecise(plateBarWeight)}, {plateDefs.length} Scheiben</p>
						</div>
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
						<div class="space-y-4 border-t border-gray-100 px-4 pb-4 pt-4 dark:border-gray-800">
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
			<p class="text-center text-xs text-gray-400">FitTrack PWA v{__APP_VERSION__}</p>
		</section>
	</ErrorBoundary>
</div>

<ConfirmDialog
	open={showRestoreDialog}
	title="Backup wiederherstellen?"
	message="Alle aktuellen Daten werden durch das Backup ersetzt. Diese Aktion kann nicht rückgängig gemacht werden."
	confirmText="Wiederherstellen"
	onconfirm={handleRestore}
	oncancel={() => { showRestoreDialog = false; selectedFile = null; }}
/>
