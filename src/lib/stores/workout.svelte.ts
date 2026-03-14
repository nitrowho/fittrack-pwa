import {
	applyWeightIncrease as applyWorkoutWeightIncrease,
	cancelWorkout as cancelWorkoutSession,
	completeWorkoutSet,
	createWorkoutSet,
	finishWorkout as finishWorkoutSession,
	removeWorkoutSet,
	startWorkout as createWorkout,
	uncompleteWorkoutSet,
	updateWorkoutSet,
	updateWorkoutSets
} from '$lib/application/workouts/commands.js';
import { loadWorkoutSession } from '$lib/application/workouts/queries.js';
import type { LastSessionData } from '$lib/application/workouts/types.js';
import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';
import { triggerSetCompletionHaptic } from '$lib/infrastructure/haptics.js';
import { releaseScreenWakeLock, requestScreenWakeLock } from '$lib/infrastructure/wake-lock.js';
import { timerStore } from './timer.svelte.js';

class WorkoutStore {
	session = $state<WorkoutSession | null>(null);
	exerciseSessions = $state<ExerciseSession[]>([]);
	sets = $state<Map<string, ExerciseSet[]>>(new Map());
	lastSessionData = $state<Map<string, LastSessionData | null>>(new Map());
	private wakeLock: WakeLockSentinel | null = null;

	get isActive(): boolean {
		return this.session !== null;
	}

	get totalVolume(): number {
		let volume = 0;
		for (const exerciseSets of this.sets.values()) {
			for (const set of exerciseSets) {
				if (set.isCompleted) {
					volume += set.weight * set.reps;
				}
			}
		}
		return volume;
	}

	get lastSessionVolume(): number {
		let volume = 0;
		for (const data of this.lastSessionData.values()) {
			if (!data) continue;
			for (const set of data.sets) {
				if (set.isCompleted) {
					volume += set.weight * set.reps;
				}
			}
		}
		return volume;
	}

	get volumeDelta(): number {
		if (this.lastSessionData.size === 0) return 0;
		return this.totalVolume - this.lastSessionVolume;
	}

	async startWorkout(templateId: string): Promise<string> {
		const snapshot = await createWorkout(templateId);
		this.applySnapshot(snapshot);
		timerStore.startSession(snapshot.session.startedAt);
		await this.acquireWakeLock();
		return snapshot.session.id;
	}

	async resumeWorkout(sessionId: string): Promise<void> {
		const snapshot = await loadWorkoutSession(sessionId);
		if (!snapshot || snapshot.session.completedAt) {
			return;
		}

		this.applySnapshot(snapshot);
		timerStore.startSession(snapshot.session.startedAt);
		await this.acquireWakeLock();
	}

	async completeSet(setId: string, weight: number, reps: number): Promise<void> {
		const completedAt = await completeWorkoutSet(setId, weight, reps);
		this.updateSetInState(setId, {
			weight,
			reps,
			isCompleted: true,
			completedAt
		});

		const exerciseSessionId = this.findExerciseSessionForSet(setId);
		if (exerciseSessionId) {
			const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
			const allSetsCompleted = exerciseSets.every((set) => set.isCompleted);
			if (!allSetsCompleted) {
				const exerciseSession = this.exerciseSessions.find(
					(item) => item.id === exerciseSessionId
				);
				if (exerciseSession) {
					timerStore.startRestTimer(exerciseSessionId, exerciseSession.restDurationSeconds);
				}
			}
		}

		triggerSetCompletionHaptic();
	}

	async uncompleteSet(setId: string): Promise<void> {
		await uncompleteWorkoutSet(setId);
		this.updateSetInState(setId, { isCompleted: false, completedAt: null });
	}

	async updateSet(setId: string, changes: Partial<ExerciseSet>): Promise<void> {
		await updateWorkoutSet(setId, changes);
		this.updateSetInState(setId, changes);

		const exerciseSessionId = this.findExerciseSessionForSet(setId);
		if (!exerciseSessionId || (changes.weight === undefined && changes.reps === undefined)) {
			return;
		}

		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		const currentSet = exerciseSets.find((set) => set.id === setId);
		if (!currentSet || currentSet.isCompleted) {
			return;
		}

		const propagatedChanges: Partial<ExerciseSet> = {};
		if (changes.weight !== undefined) propagatedChanges.weight = changes.weight;
		if (changes.reps !== undefined) propagatedChanges.reps = changes.reps;

		const otherSetIds = exerciseSets
			.filter((set) => set.id !== setId && !set.isCompleted)
			.map((set) => set.id);

		await updateWorkoutSets(otherSetIds, propagatedChanges);
		for (const otherSetId of otherSetIds) {
			this.updateSetInState(otherSetId, propagatedChanges);
		}
	}

	async addSet(exerciseSessionId: string): Promise<void> {
		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		const lastSet = exerciseSets[exerciseSets.length - 1];
		const newSet = await createWorkoutSet({
			exerciseSessionId,
			setNumber: exerciseSets.length + 1,
			weight: lastSet?.weight ?? 0,
			reps: lastSet?.reps ?? 0
		});

		this.sets.set(exerciseSessionId, [...exerciseSets, newSet]);
		this.sets = new Map(this.sets);
	}

	async removeSet(exerciseSessionId: string): Promise<void> {
		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		if (exerciseSets.length <= 1) {
			return;
		}

		const lastSet = exerciseSets[exerciseSets.length - 1];
		await removeWorkoutSet(lastSet.id);

		this.sets.set(exerciseSessionId, exerciseSets.slice(0, -1));
		this.sets = new Map(this.sets);
	}

	async applyWeightIncrease(exerciseSessionId: string, weight: number): Promise<void> {
		await applyWorkoutWeightIncrease(exerciseSessionId, weight);

		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		for (const set of exerciseSets) {
			if (!set.isCompleted) {
				this.updateSetInState(set.id, { weight });
			}
		}
	}

	async finishWorkout(): Promise<void> {
		if (!this.session) {
			return;
		}

		await finishWorkoutSession(this.session.id);
		this.reset();
	}

	async cancelWorkout(): Promise<void> {
		if (!this.session) {
			return;
		}

		await cancelWorkoutSession(this.session.id);
		this.reset();
	}

	private applySnapshot(snapshot: {
		session: WorkoutSession;
		exerciseSessions: ExerciseSession[];
		sets: Map<string, ExerciseSet[]>;
		lastSessionData: Map<string, LastSessionData | null>;
	}) {
		this.session = snapshot.session;
		this.exerciseSessions = snapshot.exerciseSessions;
		this.sets = new Map(snapshot.sets);
		this.lastSessionData = new Map(snapshot.lastSessionData);
	}

	private reset() {
		this.session = null;
		this.exerciseSessions = [];
		this.sets = new Map();
		this.lastSessionData = new Map();
		timerStore.stopSession();
		this.releaseWakeLock();
	}

	private updateSetInState(setId: string, changes: Partial<ExerciseSet>) {
		for (const [exerciseSessionId, exerciseSets] of this.sets) {
			const setIndex = exerciseSets.findIndex((set) => set.id === setId);
			if (setIndex === -1) {
				continue;
			}

			exerciseSets[setIndex] = { ...exerciseSets[setIndex], ...changes };
			this.sets.set(exerciseSessionId, [...exerciseSets]);
			this.sets = new Map(this.sets);
			return;
		}
	}

	private findExerciseSessionForSet(setId: string): string | null {
		for (const [exerciseSessionId, exerciseSets] of this.sets) {
			if (exerciseSets.some((set) => set.id === setId)) {
				return exerciseSessionId;
			}
		}
		return null;
	}

	private async acquireWakeLock() {
		releaseScreenWakeLock(this.wakeLock);
		this.wakeLock = await requestScreenWakeLock();
	}

	private releaseWakeLock() {
		releaseScreenWakeLock(this.wakeLock);
		this.wakeLock = null;
	}
}

export const workoutStore = new WorkoutStore();
