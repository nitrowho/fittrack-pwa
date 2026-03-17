import {
	createTemplate as createTemplateRecord,
	countTemplates,
	deleteTemplate as deleteTemplateRecord,
	updateTemplate as updateTemplateRecord
} from '$lib/repositories/template-repository.js';
import { createUuid } from '$lib/domain/shared/uuid.js';
import type { TemplateExerciseInput } from './types.js';

export interface CreateTemplateInput {
	name: string;
	exercises: TemplateExerciseInput[];
}

export interface UpdateTemplateInput extends CreateTemplateInput {
	id: string;
}

function validateTemplate(input: CreateTemplateInput): string {
	const name = input.name.trim();
	if (!name) {
		throw new Error('Vorlagenname fehlt');
	}

	if (input.exercises.length === 0) {
		throw new Error('Mindestens eine Übung ist erforderlich');
	}

	return name;
}

export async function createTemplate(input: CreateTemplateInput): Promise<string> {
	const name = validateTemplate(input);
	const templateId = createUuid();
	const sortOrder = await countTemplates();

	await createTemplateRecord(
		{
			id: templateId,
			name,
			sortOrder,
			createdAt: new Date()
		},
		input.exercises.map((exercise, index) => ({
			id: createUuid(),
			templateId,
			sortOrder: index,
			...exercise
		}))
	);

	return templateId;
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<void> {
	const name = validateTemplate(input);

	await updateTemplateRecord(
		{ id: input.id, name },
		input.exercises.map((exercise, index) => ({
			id: createUuid(),
			templateId: input.id,
			sortOrder: index,
			...exercise
		}))
	);
}

export async function deleteTemplate(id: string): Promise<void> {
	await deleteTemplateRecord(id);
}
