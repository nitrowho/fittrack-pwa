import type { Exercise } from '$lib/models/types.js';
import { listExercisesByName } from '$lib/repositories/exercise-repository.js';

export async function listExercises(): Promise<Exercise[]> {
	return listExercisesByName();
}
