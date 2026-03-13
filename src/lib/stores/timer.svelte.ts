import { formatTimer } from '$lib/services/formatter.js';

interface ActiveTimer {
	endTime: number;
	totalDuration: number;
}

class TimerStore {
	activeTimers = $state<Map<string, ActiveTimer>>(new Map());
	sessionStartedAt = $state<number | null>(null);
	now = $state<number>(Date.now());

	private intervalId: ReturnType<typeof setInterval> | null = null;
	private onTimerComplete: ((exerciseSessionId: string) => void) | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.start();
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') {
					this.now = Date.now();
				}
			});
		}
	}

	private start() {
		this.intervalId = setInterval(() => {
			this.now = Date.now();
			this.checkExpiredTimers();
		}, 1000);
	}

	private checkExpiredTimers() {
		for (const [id, timer] of this.activeTimers) {
			if (this.now >= timer.endTime) {
				this.activeTimers.delete(id);
				this.activeTimers = new Map(this.activeTimers);
				this.fireNotification();
				this.onTimerComplete?.(id);
			}
		}
	}

	private async fireNotification() {
		if (typeof Notification === 'undefined') return;
		if (Notification.permission !== 'granted') return;
		try {
			new Notification('FitTrack', { body: 'Pause vorbei!' });
		} catch {
			// Notification not supported in this context
		}
	}

	setOnTimerComplete(callback: (exerciseSessionId: string) => void) {
		this.onTimerComplete = callback;
	}

	startRestTimer(exerciseSessionId: string, durationSeconds: number) {
		this.requestNotificationPermission();
		const timer: ActiveTimer = {
			endTime: Date.now() + durationSeconds * 1000,
			totalDuration: durationSeconds
		};
		this.activeTimers.set(exerciseSessionId, timer);
		this.activeTimers = new Map(this.activeTimers);
	}

	skipTimer(exerciseSessionId: string) {
		this.activeTimers.delete(exerciseSessionId);
		this.activeTimers = new Map(this.activeTimers);
	}

	getRemainingSeconds(exerciseSessionId: string): number {
		const timer = this.activeTimers.get(exerciseSessionId);
		if (!timer) return 0;
		return Math.max(0, (timer.endTime - this.now) / 1000);
	}

	getProgress(exerciseSessionId: string): number {
		const timer = this.activeTimers.get(exerciseSessionId);
		if (!timer) return 0;
		const remaining = Math.max(0, timer.endTime - this.now);
		const elapsed = timer.totalDuration * 1000 - remaining;
		return Math.min(1, elapsed / (timer.totalDuration * 1000));
	}

	getRemainingFormatted(exerciseSessionId: string): string {
		return formatTimer(this.getRemainingSeconds(exerciseSessionId));
	}

	isTimerActive(exerciseSessionId: string): boolean {
		return this.activeTimers.has(exerciseSessionId);
	}

	get sessionElapsed(): number {
		if (!this.sessionStartedAt) return 0;
		return Math.floor((this.now - this.sessionStartedAt) / 1000);
	}

	startSession(startedAt: Date) {
		this.sessionStartedAt = startedAt.getTime();
	}

	stopSession() {
		this.sessionStartedAt = null;
		this.activeTimers = new Map();
	}

	private async requestNotificationPermission() {
		if (typeof Notification === 'undefined') return;
		if (Notification.permission === 'default') {
			await Notification.requestPermission();
		}
	}

	destroy() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}

export const timerStore = new TimerStore();
