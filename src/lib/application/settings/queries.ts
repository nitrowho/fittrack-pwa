import { getPlateConfig as getPlateConfigFromRepo } from '$lib/repositories/settings-repository.js';
import type { PlateConfig } from '$lib/models/types.js';

const DEFAULT_PLATE_CONFIG: PlateConfig = {
	barWeight: 20,
	plates: [
		{ weight: 20 },
		{ weight: 15 },
		{ weight: 10 },
		{ weight: 5 },
		{ weight: 2.5 },
		{ weight: 1.25 }
	]
};

export async function getPlateConfig(): Promise<PlateConfig> {
	const config = await getPlateConfigFromRepo();
	return config ?? DEFAULT_PLATE_CONFIG;
}
