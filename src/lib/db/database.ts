import Dexie, { type Table } from 'dexie';
import type {
	Exercise,
	WorkoutTemplate,
	TemplateExercise,
	WorkoutSession,
	ExerciseSession,
	ExerciseSet
} from '$lib/models/types.js';

interface SettingsRecord {
	key: string;
	value: unknown;
}

class FitTrackDB extends Dexie {
	exercises!: Table<Exercise>;
	workoutTemplates!: Table<WorkoutTemplate>;
	templateExercises!: Table<TemplateExercise>;
	workoutSessions!: Table<WorkoutSession>;
	exerciseSessions!: Table<ExerciseSession>;
	exerciseSets!: Table<ExerciseSet>;
	settings!: Table<SettingsRecord>;

	constructor() {
		super('fittrack');
		this.version(1).stores({
			exercises: 'id, name, muscleGroup',
			workoutTemplates: 'id, sortOrder',
			templateExercises: 'id, templateId, exerciseId, sortOrder',
			workoutSessions: 'id, templateId, startedAt, completedAt',
			exerciseSessions: 'id, workoutSessionId, exerciseId, sortOrder',
			exerciseSets: 'id, exerciseSessionId, setNumber'
		});

		this.version(2)
			.stores({
				exercises: 'id, name, muscleGroup',
				workoutTemplates: 'id, sortOrder',
				templateExercises: 'id, templateId, exerciseId, sortOrder',
				workoutSessions: 'id, templateId, startedAt, completedAt',
				exerciseSessions: 'id, workoutSessionId, exerciseId, sortOrder',
				exerciseSets: 'id, exerciseSessionId, setNumber',
				settings: 'key'
			})
			.upgrade((tx) => {
				const barbellNames = [
					'kniebeuge',
					'bankdrücken',
					'bankdruecken',
					'langhantelrudern',
					'kreuzheben'
				];
				return tx
					.table('exercises')
					.toCollection()
					.modify((exercise) => {
						if (exercise.isBarbell === undefined) {
							const nameLower = (exercise.name as string).toLowerCase();
							exercise.isBarbell = barbellNames.some((b) => nameLower.includes(b));
						}
					});
			});
	}
}

export const db = new FitTrackDB();

// Cascade delete helpers

export async function deleteWorkoutTemplate(id: string): Promise<void> {
	await db.transaction('rw', [db.workoutTemplates, db.templateExercises], async () => {
		await db.templateExercises.where('templateId').equals(id).delete();
		await db.workoutTemplates.delete(id);
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
			for (const esId of exerciseSessionIds) {
				await db.exerciseSets.where('exerciseSessionId').equals(esId).delete();
			}
			await db.exerciseSessions.where('workoutSessionId').equals(id).delete();
			await db.workoutSessions.delete(id);
		}
	);
}

export async function deleteExercise(id: string): Promise<void> {
	await db.transaction('rw', [db.exercises, db.templateExercises], async () => {
		await db.templateExercises.where('exerciseId').equals(id).delete();
		await db.exercises.delete(id);
	});
}
