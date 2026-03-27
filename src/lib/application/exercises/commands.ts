import type { MuscleGroup } from '$lib/models/types.js';
import { createUuid } from '$lib/domain/shared/uuid.js';
import {
	createExercise,
	deleteExercise as deleteExerciseRecord,
	updateExercise
} from '$lib/repositories/exercise-repository.js';

export interface SaveExerciseInput {
	id?: string;
	name: string;
	muscleGroup: MuscleGroup | null;
	isBarbell: boolean;
}

export async function saveExercise(input: SaveExerciseInput): Promise<string> {
	const name = input.name.trim();
	if (!name) {
		throw new Error('Übungsname fehlt');
	}

	if (input.id) {
		await updateExercise(input.id, {
			name,
			muscleGroup: input.muscleGroup,
			isBarbell: input.isBarbell
		});
		return input.id;
	}

	const id = createUuid();
	await createExercise({ id, name, muscleGroup: input.muscleGroup, isBarbell: input.isBarbell });
	return id;
}

export async function deleteExercise(id: string): Promise<void> {
	await deleteExerciseRecord(id);
}
