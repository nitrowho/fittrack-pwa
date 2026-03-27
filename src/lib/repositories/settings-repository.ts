import { db } from '$lib/db/database.js';
import type { PlateConfig } from '$lib/models/types.js';

export async function getPlateConfig(): Promise<PlateConfig | undefined> {
	const record = await db.settings.get('plateConfig');
	return record?.value as PlateConfig | undefined;
}

export async function savePlateConfig(config: PlateConfig): Promise<void> {
	await db.settings.put({ key: 'plateConfig', value: config });
}
