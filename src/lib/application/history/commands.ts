import { deleteWorkoutSession } from '$lib/repositories/workout-repository.js';

export async function deleteHistorySession(id: string): Promise<void> {
	await deleteWorkoutSession(id);
}
