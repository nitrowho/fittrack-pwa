export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
	if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
		return null;
	}

	try {
		return await navigator.wakeLock.request('screen');
	} catch {
		return null;
	}
}

export function releaseScreenWakeLock(wakeLock: WakeLockSentinel | null): void {
	wakeLock?.release();
}
