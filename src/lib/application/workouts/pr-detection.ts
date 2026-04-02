import { detectPRs, type DetectedPR } from '$lib/domain/workouts/personal-records.js';
import {
	listExerciseSessionsByExerciseId,
	listExerciseSetsByExerciseSessionIds
} from '$lib/repositories/workout-repository.js';

/**
 * Check whether completing a set at (weight, reps) for a given exercise
 * constitutes any personal records.
 *
 * @param exerciseId    The exercise being trained
 * @param weight        Weight just completed
 * @param reps          Reps just completed
 * @param excludeSetIds Set IDs to exclude (e.g. the current workout's sets)
 */
export async function checkForPRs(
	exerciseId: string,
	weight: number,
	reps: number,
	excludeSetIds: Set<string>
): Promise<DetectedPR[]> {
	const exerciseSessions = await listExerciseSessionsByExerciseId(exerciseId);
	const exerciseSessionIds = exerciseSessions.map((es) => es.id);
	const allSets = await listExerciseSetsByExerciseSessionIds(exerciseSessionIds);
	const historicalSets = allSets.filter((s) => !excludeSetIds.has(s.id));
	return detectPRs(weight, reps, historicalSets);
}
