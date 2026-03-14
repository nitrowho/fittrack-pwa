import { seedDatabase } from '$lib/db/seed.js';
import {
	requestStoragePersistence,
	type StoragePersistenceResult
} from '$lib/infrastructure/storage-persistence.js';

export type { StoragePersistenceResult } from '$lib/infrastructure/storage-persistence.js';

export interface AppInitializationResult {
	storagePersistence: StoragePersistenceResult;
}

export async function initializeApp(): Promise<AppInitializationResult> {
	await seedDatabase();
	const storagePersistence = await requestStoragePersistence();
	return { storagePersistence };
}
