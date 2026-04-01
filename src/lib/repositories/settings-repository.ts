import { db } from '$lib/db/database.js';
import type { PlateConfig } from '$lib/models/types.js';

export type ThemePreference = 'system' | 'light' | 'dark';

export async function getPlateConfig(): Promise<PlateConfig | undefined> {
	const record = await db.settings.get('plateConfig');
	return record?.value as PlateConfig | undefined;
}

export async function savePlateConfig(config: PlateConfig): Promise<void> {
	await db.settings.put({ key: 'plateConfig', value: config });
}

export async function getThemePreference(): Promise<ThemePreference> {
	const record = await db.settings.get('theme');
	const value = record?.value as string | undefined;
	if (value === 'light' || value === 'dark') return value;
	return 'system';
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
	await db.settings.put({ key: 'theme', value: theme });
}
