import type { Exercise } from '$lib/models/types.js';
import { listExercises } from '$lib/application/exercises/queries.js';
import {
	getTemplate,
	listAllTemplateExercises,
	listTemplateExercisesByTemplateId,
	listTemplatesBySortOrder
} from '$lib/repositories/template-repository.js';
import type {
	TemplateDetailExercise,
	TemplateEditorData,
	TemplateSummary
} from './types.js';

export async function listTemplatesWithCounts(): Promise<TemplateSummary[]> {
	const [templates, templateExercises] = await Promise.all([
		listTemplatesBySortOrder(),
		listAllTemplateExercises()
	]);

	const counts = new Map<string, number>();
	for (const templateExercise of templateExercises) {
		counts.set(
			templateExercise.templateId,
			(counts.get(templateExercise.templateId) ?? 0) + 1
		);
	}

	return templates.map((template) => ({
		template,
		exerciseCount: counts.get(template.id) ?? 0
	}));
}

export async function getTemplateDetail(
	templateId: string
): Promise<{ template: Awaited<ReturnType<typeof getTemplate>>; exercises: TemplateDetailExercise[] }> {
	const [template, templateExercises, exercises] = await Promise.all([
		getTemplate(templateId),
		listTemplateExercisesByTemplateId(templateId),
		listExercises()
	]);

	if (!template) {
		return { template: null, exercises: [] };
	}

	const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));

	return {
		template,
		exercises: templateExercises.map((templateExercise) => ({
			...templateExercise,
			exercise: exerciseMap.get(templateExercise.exerciseId) ?? null
		}))
	};
}

export async function getTemplateEditorData(
	templateId: string
): Promise<TemplateEditorData | null> {
	const [template, availableExercises, templateExercises] = await Promise.all([
		getTemplate(templateId),
		listExercises(),
		listTemplateExercisesByTemplateId(templateId)
	]);

	if (!template) {
		return null;
	}

	return {
		template,
		availableExercises,
		selectedExercises: templateExercises.map((templateExercise) => ({
			exerciseId: templateExercise.exerciseId,
			targetSets: templateExercise.targetSets,
			repRangeLower: templateExercise.repRangeLower,
			repRangeUpper: templateExercise.repRangeUpper,
			restDurationSeconds: templateExercise.restDurationSeconds
		}))
	};
}

export async function listTemplateFormExercises(): Promise<Exercise[]> {
	return listExercises();
}
