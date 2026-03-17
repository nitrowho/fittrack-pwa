import { initializeApp, type StoragePersistenceResult } from '$lib/application/app/initialize.js';

const initialStoragePersistenceResult: StoragePersistenceResult = {
	status: 'idle',
	isPersisted: false
};

class AppStore {
	initialized = $state(false);
	isInitializing = $state(false);
	storagePersistence = $state<StoragePersistenceResult>(initialStoragePersistenceResult);
	initializationError = $state<string | null>(null);

	async initialize(): Promise<void> {
		if (this.initialized || this.isInitializing) {
			return;
		}

		this.isInitializing = true;
		this.initializationError = null;

		try {
			const result = await initializeApp();
			this.storagePersistence = result.storagePersistence;
			this.initialized = true;
		} catch (error) {
			this.initializationError =
				error instanceof Error ? error.message : 'Die App konnte nicht initialisiert werden';
		} finally {
			this.isInitializing = false;
		}
	}
}

export const appStore = new AppStore();
