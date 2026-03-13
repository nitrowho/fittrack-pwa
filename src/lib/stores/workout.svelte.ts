import { db } from '$lib/db/database.js';
import { deleteWorkoutSession } from '$lib/db/database.js';
import type {
	WorkoutSession,
	ExerciseSession,
	ExerciseSet,
	TemplateExercise
} from '$lib/models/types.js';
import { timerStore } from './timer.svelte.js';

interface LastSessionData {
	session: ExerciseSession;
	sets: ExerciseSet[];
}

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
		const template = await db.workoutTemplates.get(templateId);
		if (!template) throw new Error('Template not found');

		const templateExercises = await db.templateExercises
			.where('templateId')
			.equals(templateId)
			.sortBy('sortOrder');

		const exercises = await db.exercises.toArray();
		const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

		const sessionId = crypto.randomUUID();
		const now = new Date();

		const workoutSession: WorkoutSession = {
			id: sessionId,
			templateId,
			templateName: template.name,
			startedAt: now,
			completedAt: null,
			notes: ''
		};

		const exerciseSessions: ExerciseSession[] = [];
		const allSets: ExerciseSet[] = [];
		const lastData = new Map<string, LastSessionData | null>();

		for (const te of templateExercises) {
			const exercise = exerciseMap.get(te.exerciseId);
			const esId = crypto.randomUUID();

			const exerciseSession: ExerciseSession = {
				id: esId,
				workoutSessionId: sessionId,
				exerciseId: te.exerciseId,
				exerciseName: exercise?.name ?? 'Unknown',
				muscleGroup: exercise?.muscleGroup ?? null,
				sortOrder: te.sortOrder,
				startedAt: null,
				completedAt: null,
				targetSets: te.targetSets,
				repRangeLower: te.repRangeLower,
				repRangeUpper: te.repRangeUpper,
				restDurationSeconds: te.restDurationSeconds
			};

			exerciseSessions.push(exerciseSession);

			// Get last session data for this exercise
			const lastSession = await this.getLastExerciseSession(te.exerciseId);
			lastData.set(esId, lastSession);

			// Create sets, pre-populated from last session
			const sets = this.createSetsFromTemplate(te, esId, lastSession);
			allSets.push(...sets);
		}

		// Persist to database
		await db.transaction(
			'rw',
			[db.workoutSessions, db.exerciseSessions, db.exerciseSets],
			async () => {
				await db.workoutSessions.add(workoutSession);
				await db.exerciseSessions.bulkAdd(exerciseSessions);
				await db.exerciseSets.bulkAdd(allSets);
			}
		);

		// Update state
		this.session = workoutSession;
		this.exerciseSessions = exerciseSessions;
		this.sets = new Map(exerciseSessions.map((es) => [es.id, allSets.filter((s) => s.exerciseSessionId === es.id)]));
		this.lastSessionData = lastData;

		// Start session timer and wake lock
		timerStore.startSession(now);
		await this.acquireWakeLock();

		return sessionId;
	}

	async resumeWorkout(sessionId: string): Promise<void> {
		const session = await db.workoutSessions.get(sessionId);
		if (!session || session.completedAt) return;

		const exerciseSessions = await db.exerciseSessions
			.where('workoutSessionId')
			.equals(sessionId)
			.sortBy('sortOrder');

		const setsMap = new Map<string, ExerciseSet[]>();
		const lastData = new Map<string, LastSessionData | null>();

		for (const es of exerciseSessions) {
			const sets = await db.exerciseSets
				.where('exerciseSessionId')
				.equals(es.id)
				.sortBy('setNumber');
			setsMap.set(es.id, sets);

			const lastSession = await this.getLastExerciseSession(es.exerciseId, sessionId);
			lastData.set(es.id, lastSession);
		}

		this.session = session;
		this.exerciseSessions = exerciseSessions;
		this.sets = setsMap;
		this.lastSessionData = lastData;

		timerStore.startSession(session.startedAt);
		await this.acquireWakeLock();
	}

	async completeSet(setId: string, weight: number, reps: number): Promise<void> {
		const now = new Date();
		await db.exerciseSets.update(setId, {
			weight,
			reps,
			isCompleted: true,
			completedAt: now
		});

		this.updateSetInState(setId, { weight, reps, isCompleted: true, completedAt: now });

		// Find the exercise session for this set and start rest timer
		const exerciseSessionId = this.findExerciseSessionForSet(setId);
		if (exerciseSessionId) {
			const es = this.exerciseSessions.find((e) => e.id === exerciseSessionId);
			if (es) {
				timerStore.startRestTimer(exerciseSessionId, es.restDurationSeconds);
			}
		}

		// Haptic feedback
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			navigator.vibrate(10);
		}
	}

	async uncompleteSet(setId: string): Promise<void> {
		await db.exerciseSets.update(setId, {
			isCompleted: false,
			completedAt: null
		});
		this.updateSetInState(setId, { isCompleted: false, completedAt: null });
	}

	async updateSet(setId: string, changes: Partial<ExerciseSet>): Promise<void> {
		await db.exerciseSets.update(setId, changes);
		this.updateSetInState(setId, changes);

		// Auto-populate: update other incomplete sets in the same exercise
		const exerciseSessionId = this.findExerciseSessionForSet(setId);
		if (exerciseSessionId && (changes.weight !== undefined || changes.reps !== undefined)) {
			const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
			const currentSet = exerciseSets.find((s) => s.id === setId);
			if (currentSet && !currentSet.isCompleted) {
				for (const other of exerciseSets) {
					if (other.id !== setId && !other.isCompleted) {
						const update: Partial<ExerciseSet> = {};
						if (changes.weight !== undefined) update.weight = changes.weight;
						if (changes.reps !== undefined) update.reps = changes.reps;
						await db.exerciseSets.update(other.id, update);
						this.updateSetInState(other.id, update);
					}
				}
			}
		}
	}

	async addSet(exerciseSessionId: string): Promise<void> {
		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		const lastSet = exerciseSets[exerciseSets.length - 1];

		const newSet: ExerciseSet = {
			id: crypto.randomUUID(),
			exerciseSessionId,
			setNumber: exerciseSets.length + 1,
			weight: lastSet?.weight ?? 0,
			reps: lastSet?.reps ?? 0,
			rir: null,
			isCompleted: false,
			completedAt: null
		};

		await db.exerciseSets.add(newSet);
		const updated = [...exerciseSets, newSet];
		this.sets.set(exerciseSessionId, updated);
		this.sets = new Map(this.sets);
	}

	async removeSet(exerciseSessionId: string): Promise<void> {
		const exerciseSets = this.sets.get(exerciseSessionId) ?? [];
		if (exerciseSets.length <= 1) return;

		const lastSet = exerciseSets[exerciseSets.length - 1];
		await db.exerciseSets.delete(lastSet.id);

		const updated = exerciseSets.slice(0, -1);
		this.sets.set(exerciseSessionId, updated);
		this.sets = new Map(this.sets);
	}

	async finishWorkout(): Promise<void> {
		if (!this.session) return;

		const now = new Date();
		await db.workoutSessions.update(this.session.id, { completedAt: now });

		// Mark all exercise sessions as completed
		for (const es of this.exerciseSessions) {
			await db.exerciseSessions.update(es.id, { completedAt: now });
		}

		this.reset();
	}

	async cancelWorkout(): Promise<void> {
		if (!this.session) return;
		await deleteWorkoutSession(this.session.id);
		this.reset();
	}

	private reset() {
		this.session = null;
		this.exerciseSessions = [];
		this.sets = new Map();
		this.lastSessionData = new Map();
		timerStore.stopSession();
		this.releaseWakeLock();
	}

	private async getLastExerciseSession(
		exerciseId: string,
		excludeSessionId?: string
	): Promise<LastSessionData | null> {
		const sessions = await db.exerciseSessions
			.where('exerciseId')
			.equals(exerciseId)
			.toArray();

		const completed = sessions
			.filter((s) => s.completedAt !== null)
			.filter((s) => !excludeSessionId || s.workoutSessionId !== excludeSessionId)
			.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

		if (completed.length === 0) return null;

		const latest = completed[0];
		const sets = await db.exerciseSets
			.where('exerciseSessionId')
			.equals(latest.id)
			.sortBy('setNumber');

		return { session: latest, sets };
	}

	private createSetsFromTemplate(
		te: TemplateExercise,
		exerciseSessionId: string,
		lastSession: LastSessionData | null
	): ExerciseSet[] {
		const sets: ExerciseSet[] = [];
		for (let i = 0; i < te.targetSets; i++) {
			const lastSet = lastSession?.sets[i];
			sets.push({
				id: crypto.randomUUID(),
				exerciseSessionId,
				setNumber: i + 1,
				weight: lastSet?.weight ?? 0,
				reps: lastSet?.reps ?? 0,
				rir: null,
				isCompleted: false,
				completedAt: null
			});
		}
		return sets;
	}

	private updateSetInState(setId: string, changes: Partial<ExerciseSet>) {
		for (const [esId, exerciseSets] of this.sets) {
			const idx = exerciseSets.findIndex((s) => s.id === setId);
			if (idx !== -1) {
				exerciseSets[idx] = { ...exerciseSets[idx], ...changes };
				this.sets.set(esId, [...exerciseSets]);
				this.sets = new Map(this.sets);
				return;
			}
		}
	}

	private findExerciseSessionForSet(setId: string): string | null {
		for (const [esId, exerciseSets] of this.sets) {
			if (exerciseSets.some((s) => s.id === setId)) return esId;
		}
		return null;
	}

	private async acquireWakeLock() {
		if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
		try {
			this.wakeLock = await navigator.wakeLock.request('screen');
		} catch {
			// Wake lock not available
		}
	}

	private releaseWakeLock() {
		this.wakeLock?.release();
		this.wakeLock = null;
	}
}

export const workoutStore = new WorkoutStore();
