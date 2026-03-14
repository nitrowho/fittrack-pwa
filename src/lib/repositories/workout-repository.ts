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

export async function listAllExerciseSets(): Promise<ExerciseSet[]> {
	return db.exerciseSets.toArray();
}

export async function listExerciseSetsByExerciseSessionId(
	exerciseSessionId: string
): Promise<ExerciseSet[]> {
	return db.exerciseSets.where('exerciseSessionId').equals(exerciseSessionId).sortBy('setNumber');
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
