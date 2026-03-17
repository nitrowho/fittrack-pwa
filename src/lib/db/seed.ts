import { db } from './database.js';
import { createUuid } from '$lib/domain/shared/uuid.js';
import type { Exercise, WorkoutTemplate, TemplateExercise } from '$lib/models/types.js';

export async function seedDatabase(): Promise<void> {
	const count = await db.exercises.count();
	if (count > 0) return;

	const exercises: Exercise[] = [
		{ id: createUuid(), name: 'Kniebeuge', muscleGroup: 'beine' },
		{ id: createUuid(), name: 'Bankdrücken', muscleGroup: 'brust' },
		{ id: createUuid(), name: 'Chin-Ups', muscleGroup: 'ruecken' },
		{ id: createUuid(), name: 'Langhantelrudern Obergriff', muscleGroup: 'ruecken' },
		{ id: createUuid(), name: 'Rumänisches Kreuzheben', muscleGroup: 'beine' }
	];

	const now = new Date();

	const templates: WorkoutTemplate[] = [
		{ id: createUuid(), name: 'Workout A', sortOrder: 0, createdAt: now },
		{ id: createUuid(), name: 'Workout B', sortOrder: 1, createdAt: now }
	];

	const templateExercises: TemplateExercise[] = [
		// Workout A
		{
			id: createUuid(),
			templateId: templates[0].id,
			exerciseId: exercises[0].id, // Kniebeuge
			sortOrder: 0,
			targetSets: 3,
			repRangeLower: 5,
			repRangeUpper: 8,
			restDurationSeconds: 240
		},
		{
			id: createUuid(),
			templateId: templates[0].id,
			exerciseId: exercises[1].id, // Bankdrücken
			sortOrder: 1,
			targetSets: 3,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 210
		},
		{
			id: createUuid(),
			templateId: templates[0].id,
			exerciseId: exercises[2].id, // Chin-Ups
			sortOrder: 2,
			targetSets: 3,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 195
		},
		{
			id: createUuid(),
			templateId: templates[0].id,
			exerciseId: exercises[3].id, // Langhantelrudern
			sortOrder: 3,
			targetSets: 2,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 150
		},
		// Workout B
		{
			id: createUuid(),
			templateId: templates[1].id,
			exerciseId: exercises[4].id, // Rumänisches Kreuzheben
			sortOrder: 0,
			targetSets: 3,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 240
		},
		{
			id: createUuid(),
			templateId: templates[1].id,
			exerciseId: exercises[1].id, // Bankdrücken
			sortOrder: 1,
			targetSets: 3,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 210
		},
		{
			id: createUuid(),
			templateId: templates[1].id,
			exerciseId: exercises[2].id, // Chin-Ups
			sortOrder: 2,
			targetSets: 3,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 195
		},
		{
			id: createUuid(),
			templateId: templates[1].id,
			exerciseId: exercises[3].id, // Langhantelrudern
			sortOrder: 3,
			targetSets: 2,
			repRangeLower: 6,
			repRangeUpper: 10,
			restDurationSeconds: 150
		}
	];

	await db.transaction(
		'rw',
		[db.exercises, db.workoutTemplates, db.templateExercises],
		async () => {
			await db.exercises.bulkAdd(exercises);
			await db.workoutTemplates.bulkAdd(templates);
			await db.templateExercises.bulkAdd(templateExercises);
		}
	);
}
