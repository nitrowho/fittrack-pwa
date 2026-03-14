import { initializeApp, type StoragePersistenceResult } from '$lib/application/app/initialize.js';

const initialStoragePersistenceResult: StoragePersistenceResult = {
	status: 'idle',
	isPersisted: false
};

class AppStore {
	initialized = $state(false);
	isInitializing = $state(false);
	storagePersistence = $state<StoragePersistenceResult>(initialStoragePersistenceResult);

	async initialize(): Promise<void> {
		if (this.initialized || this.isInitializing) {
			return;
		}

		this.isInitializing = true;

		try {
			const result = await initializeApp();
			this.storagePersistence = result.storagePersistence;
			this.initialized = true;
		} finally {
			this.isInitializing = false;
		}
	}
}

export const appStore = new AppStore();
