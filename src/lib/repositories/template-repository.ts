import { db } from '$lib/db/database.js';
import type { TemplateExercise, WorkoutTemplate } from '$lib/models/types.js';

export interface TemplateExerciseRecord {
	id: string;
	templateId: string;
	exerciseId: string;
	sortOrder: number;
	targetSets: number;
	repRangeLower: number;
	repRangeUpper: number;
	restDurationSeconds: number;
}

export async function listTemplatesBySortOrder(): Promise<WorkoutTemplate[]> {
	return db.workoutTemplates.orderBy('sortOrder').toArray();
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | null> {
	return (await db.workoutTemplates.get(id)) ?? null;
}

export async function countTemplates(): Promise<number> {
	return db.workoutTemplates.count();
}

export async function listAllTemplateExercises(): Promise<TemplateExercise[]> {
	return db.templateExercises.toArray();
}

export async function listTemplateExercisesByTemplateId(
	templateId: string
): Promise<TemplateExercise[]> {
	return db.templateExercises.where('templateId').equals(templateId).sortBy('sortOrder');
}

export async function createTemplate(
	template: WorkoutTemplate,
	exercises: TemplateExerciseRecord[]
): Promise<void> {
	await db.transaction('rw', [db.workoutTemplates, db.templateExercises], async () => {
		await db.workoutTemplates.add(template);
		await db.templateExercises.bulkAdd(exercises);
	});
}

export async function updateTemplate(
	template: Pick<WorkoutTemplate, 'id' | 'name'>,
	exercises: TemplateExerciseRecord[]
): Promise<void> {
	await db.transaction('rw', [db.workoutTemplates, db.templateExercises], async () => {
		await db.workoutTemplates.update(template.id, { name: template.name });
		await db.templateExercises.where('templateId').equals(template.id).delete();
		await db.templateExercises.bulkAdd(exercises);
	});
}

export async function deleteTemplate(id: string): Promise<void> {
	await db.transaction('rw', [db.workoutTemplates, db.templateExercises], async () => {
		await db.templateExercises.where('templateId').equals(id).delete();
		await db.workoutTemplates.delete(id);
	});
}
