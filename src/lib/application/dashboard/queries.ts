import type { WorkoutSession } from '$lib/models/types.js';
import { listExercises } from '$lib/application/exercises/queries.js';
import {
	listAllTemplateExercises,
	listTemplatesBySortOrder
} from '$lib/repositories/template-repository.js';
import { listWorkoutSessions } from '$lib/repositories/workout-repository.js';

export interface DashboardTemplate {
	id: string;
	name: string;
	exerciseNames: string[];
}

export interface DashboardData {
	templates: DashboardTemplate[];
	recentSessions: WorkoutSession[];
	inProgressSession: WorkoutSession | null;
	lastCompletedTemplateId: string | null;
}

export async function getDashboardData(): Promise<DashboardData> {
	const [templates, templateExercises, exercises, sessions] = await Promise.all([
		listTemplatesBySortOrder(),
		listAllTemplateExercises(),
		listExercises(),
		listWorkoutSessions()
	]);

	const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
	const templateExercisesByTemplateId = new Map<string, typeof templateExercises>();

	for (const templateExercise of templateExercises) {
		const entries = templateExercisesByTemplateId.get(templateExercise.templateId) ?? [];
		entries.push(templateExercise);
		templateExercisesByTemplateId.set(templateExercise.templateId, entries);
	}

	const completedSessions = sessions
		.filter((session) => session.completedAt !== null)
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

	return {
		templates: templates.map((template) => ({
			id: template.id,
			name: template.name,
			exerciseNames: (templateExercisesByTemplateId.get(template.id) ?? [])
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((templateExercise) => exerciseMap.get(templateExercise.exerciseId)?.name ?? 'Unknown')
		})),
		recentSessions: completedSessions.slice(0, 3),
		inProgressSession: sessions.find((session) => session.completedAt === null) ?? null,
		lastCompletedTemplateId: completedSessions[0]?.templateId ?? null
	};
}
