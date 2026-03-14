export type StoragePersistenceStatus = 'idle' | 'granted' | 'best-effort' | 'unsupported';

export interface StoragePersistenceResult {
	status: StoragePersistenceStatus;
	isPersisted: boolean;
}

export const idleStoragePersistenceResult: StoragePersistenceResult = {
	status: 'idle',
	isPersisted: false
};

export async function requestStoragePersistence(): Promise<StoragePersistenceResult> {
	if (typeof navigator === 'undefined') {
		return idleStoragePersistenceResult;
	}

	const storageManager = navigator.storage;
	if (!storageManager?.persist || !storageManager.persisted) {
		return {
			status: 'unsupported',
			isPersisted: false
		};
	}

	const alreadyPersisted = await storageManager.persisted();
	if (alreadyPersisted) {
		return {
			status: 'granted',
			isPersisted: true
		};
	}

	const granted = await storageManager.persist();
	return {
		status: granted ? 'granted' : 'best-effort',
		isPersisted: granted
	};
}
