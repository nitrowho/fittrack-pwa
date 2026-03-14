export function triggerSetCompletionHaptic(): void {
	if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
		return;
	}

	navigator.vibrate(10);
}
