import { db } from '$lib/db/database.js';
import type { WorkoutSession } from '$lib/models/types.js';

export async function listWorkoutSessions(): Promise<WorkoutSession[]> {
	return db.workoutSessions.toArray();
}
