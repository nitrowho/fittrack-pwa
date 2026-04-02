import {
	addExerciseToWorkout,
	applyWeightIncrease as applyWorkoutWeightIncrease,
	cancelWorkout as cancelWorkoutSession,
	completeWorkoutSet,
	createWorkoutSet,
	finishWorkout as finishWorkoutSession,
	removeExerciseFromWorkout,
	removeWorkoutSet,
	startCustomWorkout as createCustomWorkout,
	startWorkout as createWorkout,
	uncompleteWorkoutSet,
	updateNotes as updateWorkoutNotes,
	updateWorkoutSet,
	updateWorkoutSets
} from '$lib/application/workouts/commands.js';
import { loadWorkoutSession } from '$lib/application/workouts/queries.js';
import type { LastSessionData } from '$lib/application/workouts/types.js';
import type { Exercise, ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';
import { triggerSetCompletionHaptic } from '$lib/infrastructure/haptics.js';
import { releaseScreenWakeLock, requestScreenWakeLock } from '$lib/infrastructure/wake-lock.js';
import { timerStore } from './timer.svelte.js';

class WorkoutStore {
	session = $state<WorkoutSession | null>(null);
	exerciseSessions = $state<ExerciseSession[]>([]);
	sets = $state<Map<string, ExerciseSet[]>>(new Map());
	lastSessionData = $state<Map<string, LastSessionData | null>>(new Map());
	private startedExerciseOrder = $state<string[]>([]);
	private wakeLock: WakeLockSentinel | null = null;

	constructor() {
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible' && this.isActive) {
					this.acquireWakeLock();
				}
			});
		}
	}

	get orderedExerciseSessions(): ExerciseSession[] {
		const started = this.startedExerciseOrder
			.map((id) => this.exerciseSessions.find((es) => es.id === id))
			.filter((es): es is ExerciseSession => es !== undefined);
		const unstarted = this.exerciseSessions.filter(
			(es) => !this.startedExerciseOrder.includes(es.id)
		);
		return [...started, ...unstarted];
	}

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

	async startCustomWorkout(): Promise<string> {
		const snapshot = await createCustomWorkout();
		this.applySnapshot(snapshot);
		timerStore.startSession(snapshot.session.startedAt);
		await this.acquireWakeLock();
		return snapshot.session.id;
	}

	async addExercise(exercise: Exercise): Promise<void> {
		if (!this.session) return;

		const sortOrder = this.exerciseSessions.length;
		const result = await addExerciseToWorkout(this.session.id, exercise, sortOrder);

		this.exerciseSessions = [...this.exerciseSessions, result.exerciseSession];
		this.sets.set(result.exerciseSession.id, result.sets);
		this.sets = new Map(this.sets);
		this.lastSessionData.set(result.exerciseSession.id, result.lastSession);
		this.lastSessionData = new Map(this.lastSessionData);
	}

	async removeExercise(exerciseSessionId: string): Promise<void> {
		await removeExerciseFromWorkout(exerciseSessionId);

		this.exerciseSessions = this.exerciseSessions.filter((es) => es.id !== exerciseSessionId);
		this.sets.delete(exerciseSessionId);
		this.sets = new Map(this.sets);
		this.lastSessionData.delete(exerciseSessionId);
		this.lastSessionData = new Map(this.lastSessionData);
		this.startedExerciseOrder = this.startedExerciseOrder.filter((id) => id !== exerciseSessionId);
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
			if (!this.startedExerciseOrder.includes(exerciseSessionId)) {
				this.startedExerciseOrder = [...this.startedExerciseOrder, exerciseSessionId];
			}

			const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
			const allSetsCompleted = exerciseSets.every((set) => set.isCompleted);
			if (!allSetsCompleted) {
				const exerciseSession = this.exerciseSessions.find(
					(item) => item.id === exerciseSessionId
				);
				if (exerciseSession) {
					timerStore.startRestTimer(exerciseSessionId, exerciseSession.restDurationSeconds);
				}
			} else {
				timerStore.skipTimer(exerciseSessionId);
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

	async updateNotes(notes: string): Promise<void> {
		if (!this.session) return;
		await updateWorkoutNotes(this.session.id, notes);
		this.session = { ...this.session, notes };
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
		this.startedExerciseOrder = this.buildStartedOrder(snapshot.exerciseSessions, snapshot.sets);
	}

	private buildStartedOrder(
		sessions: ExerciseSession[],
		sets: Map<string, ExerciseSet[]>
	): string[] {
		return sessions
			.filter((es) => {
				const exerciseSets = sets.get(es.id) ?? [];
				return exerciseSets.some((s) => s.isCompleted);
			})
			.sort((a, b) => {
				const aFirst = this.earliestCompletion(sets.get(a.id) ?? []);
				const bFirst = this.earliestCompletion(sets.get(b.id) ?? []);
				return aFirst - bFirst;
			})
			.map((es) => es.id);
	}

	private earliestCompletion(exerciseSets: ExerciseSet[]): number {
		let earliest = Infinity;
		for (const s of exerciseSets) {
			if (s.completedAt) {
				const time = s.completedAt.getTime();
				if (time < earliest) {
					earliest = time;
				}
			}
		}
		return earliest;
	}

	private reset() {
		this.session = null;
		this.exerciseSessions = [];
		this.sets = new Map();
		this.lastSessionData = new Map();
		this.startedExerciseOrder = [];
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
