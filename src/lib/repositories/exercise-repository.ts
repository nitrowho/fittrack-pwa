import { db } from '$lib/db/database.js';
import type { Exercise, MuscleGroup } from '$lib/models/types.js';

export interface ExerciseRecord {
	id: string;
	name: string;
	muscleGroup: MuscleGroup | null;
}

export async function listExercisesByName(): Promise<Exercise[]> {
	return db.exercises.orderBy('name').toArray();
}

export async function createExercise(record: ExerciseRecord): Promise<void> {
	await db.exercises.add(record);
}

export async function updateExercise(
	id: string,
	changes: Pick<ExerciseRecord, 'name' | 'muscleGroup'>
): Promise<void> {
	await db.exercises.update(id, changes);
}

export async function deleteExercise(id: string): Promise<void> {
	await db.transaction('rw', [db.exercises, db.templateExercises], async () => {
		await db.templateExercises.where('exerciseId').equals(id).delete();
		await db.exercises.delete(id);
	});
}
