import { db } from '$lib/db/database.js';
import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';

export async function listWorkoutSessions(): Promise<WorkoutSession[]> {
	return db.workoutSessions.toArray();
}

export async function getWorkoutSession(id: string): Promise<WorkoutSession | null> {
	return (await db.workoutSessions.get(id)) ?? null;
}

export async function listAllExerciseSessions(): Promise<ExerciseSession[]> {
	return db.exerciseSessions.toArray();
}

export async function listExerciseSessionsByWorkoutSessionId(
	workoutSessionId: string
): Promise<ExerciseSession[]> {
	return db.exerciseSessions.where('workoutSessionId').equals(workoutSessionId).sortBy('sortOrder');
}

export async function listExerciseSessionsByExerciseId(
	exerciseId: string
): Promise<ExerciseSession[]> {
	return db.exerciseSessions.where('exerciseId').equals(exerciseId).toArray();
}

export async function listAllExerciseSets(): Promise<ExerciseSet[]> {
	return db.exerciseSets.toArray();
}

export async function listExerciseSetsByExerciseSessionId(
	exerciseSessionId: string
): Promise<ExerciseSet[]> {
	return db.exerciseSets.where('exerciseSessionId').equals(exerciseSessionId).sortBy('setNumber');
}

export async function createWorkoutSessionGraph(
	workoutSession: WorkoutSession,
	exerciseSessions: ExerciseSession[],
	exerciseSets: ExerciseSet[]
): Promise<void> {
	await db.transaction(
		'rw',
		[db.workoutSessions, db.exerciseSessions, db.exerciseSets],
		async () => {
			await db.workoutSessions.add(workoutSession);
			await db.exerciseSessions.bulkAdd(exerciseSessions);
			await db.exerciseSets.bulkAdd(exerciseSets);
		}
	);
}

export async function addExerciseSessionGraph(
	exerciseSession: ExerciseSession,
	exerciseSets: ExerciseSet[]
): Promise<void> {
	await db.transaction('rw', [db.exerciseSessions, db.exerciseSets], async () => {
		await db.exerciseSessions.add(exerciseSession);
		await db.exerciseSets.bulkAdd(exerciseSets);
	});
}

export async function deleteExerciseSession(exerciseSessionId: string): Promise<void> {
	await db.transaction('rw', [db.exerciseSessions, db.exerciseSets], async () => {
		await db.exerciseSets.where('exerciseSessionId').equals(exerciseSessionId).delete();
		await db.exerciseSessions.delete(exerciseSessionId);
	});
}

export async function updateExerciseSet(
	id: string,
	changes: Partial<ExerciseSet>
): Promise<void> {
	await db.exerciseSets.update(id, changes);
}

export async function updateExerciseSets(
	ids: string[],
	changes: Partial<ExerciseSet>
): Promise<void> {
	if (ids.length === 0) {
		return;
	}

	await db.transaction('rw', db.exerciseSets, async () => {
		for (const id of ids) {
			await db.exerciseSets.update(id, changes);
		}
	});
}

export async function addExerciseSet(exerciseSet: ExerciseSet): Promise<void> {
	await db.exerciseSets.add(exerciseSet);
}

export async function deleteExerciseSet(id: string): Promise<void> {
	await db.exerciseSets.delete(id);
}

export async function finishWorkoutSession(
	workoutSessionId: string,
	completedAt: Date
): Promise<void> {
	await db.transaction('rw', [db.workoutSessions, db.exerciseSessions], async () => {
		await db.workoutSessions.update(workoutSessionId, { completedAt });

		const exerciseSessions = await db.exerciseSessions
			.where('workoutSessionId')
			.equals(workoutSessionId)
			.toArray();

		for (const exerciseSession of exerciseSessions) {
			await db.exerciseSessions.update(exerciseSession.id, { completedAt });
		}
	});
}

export async function deleteWorkoutSession(id: string): Promise<void> {
	await db.transaction(
		'rw',
		[db.workoutSessions, db.exerciseSessions, db.exerciseSets],
		async () => {
			const exerciseSessionIds = await db.exerciseSessions
				.where('workoutSessionId')
				.equals(id)
				.primaryKeys();
			for (const exerciseSessionId of exerciseSessionIds) {
				await db.exerciseSets.where('exerciseSessionId').equals(exerciseSessionId as string).delete();
			}
			await db.exerciseSessions.where('workoutSessionId').equals(id).delete();
			await db.workoutSessions.delete(id);
		}
	);
}
