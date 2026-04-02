import { listExercisesByName } from '$lib/repositories/exercise-repository.js';
import { getTemplate, listTemplateExercisesByTemplateId } from '$lib/repositories/template-repository.js';
import {
	getWorkoutSession,
	listAllExerciseSessions,
	listAllExerciseSets,
	listExerciseSessionsByWorkoutSessionId
} from '$lib/repositories/workout-repository.js';
import { getProgressionRecommendation, type ProgressionResult } from '$lib/domain/workouts/progression.js';
import type { ExerciseSession, ExerciseSet, TemplateExercise, WorkoutSession } from '$lib/models/types.js';
import type { LastSessionData, WorkoutStateSnapshot } from './types.js';
import { buildExerciseSetsMap } from './set-map.js';

export function getLastExerciseSessionData(
	exerciseId: string,
	exerciseSessions: ExerciseSession[],
	setsByExerciseSessionId: Map<string, ExerciseSet[]>,
	excludeWorkoutSessionId?: string
): LastSessionData | null {
	const completedSessions = exerciseSessions
		.filter((exerciseSession) => exerciseSession.exerciseId === exerciseId)
		.filter((exerciseSession) => exerciseSession.completedAt !== null)
		.filter(
			(exerciseSession) =>
				!excludeWorkoutSessionId || exerciseSession.workoutSessionId !== excludeWorkoutSessionId
		)
		.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

	if (completedSessions.length === 0) {
		return null;
	}

	const latestSession = completedSessions[0];
	return {
		session: latestSession,
		sets: setsByExerciseSessionId.get(latestSession.id) ?? []
	};
}

function createWorkoutSnapshot(
	session: WorkoutSession,
	exerciseSessions: ExerciseSession[],
	allExerciseSessions: ExerciseSession[],
	allExerciseSets: ExerciseSet[]
): WorkoutStateSnapshot {
	const allSetsByExerciseSessionId = buildExerciseSetsMap(allExerciseSets);
	const currentSets = new Map<string, ExerciseSet[]>();
	const lastSessionData = new Map<string, LastSessionData | null>();

	for (const exerciseSession of exerciseSessions) {
		currentSets.set(exerciseSession.id, allSetsByExerciseSessionId.get(exerciseSession.id) ?? []);
		lastSessionData.set(
			exerciseSession.id,
			getLastExerciseSessionData(
				exerciseSession.exerciseId,
				allExerciseSessions,
				allSetsByExerciseSessionId,
				session.id
			)
		);
	}

	return {
		session,
		exerciseSessions,
		sets: currentSets,
		lastSessionData
	};
}

export async function getWorkoutStartData(
	templateId: string
): Promise<{
	template: Awaited<ReturnType<typeof getTemplate>>;
	templateExercises: TemplateExercise[];
	exerciseNames: Map<string, { name: string; muscleGroup: ExerciseSession['muscleGroup'] }>;
	allExerciseSessions: ExerciseSession[];
	allExerciseSets: ExerciseSet[];
}> {
	const [template, templateExercises, exercises, allExerciseSessions, allExerciseSets] =
		await Promise.all([
			getTemplate(templateId),
			listTemplateExercisesByTemplateId(templateId),
			listExercisesByName(),
			listAllExerciseSessions(),
			listAllExerciseSets()
		]);

	return {
		template,
		templateExercises,
		exerciseNames: new Map(
			exercises.map((exercise) => [
				exercise.id,
				{ name: exercise.name, muscleGroup: exercise.muscleGroup }
			])
		),
		allExerciseSessions,
		allExerciseSets
	};
}

export async function loadWorkoutSession(
	sessionId: string
): Promise<WorkoutStateSnapshot | null> {
	const [session, exerciseSessions, allExerciseSessions, allExerciseSets] = await Promise.all([
		getWorkoutSession(sessionId),
		listExerciseSessionsByWorkoutSessionId(sessionId),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	if (!session) {
		return null;
	}

	return createWorkoutSnapshot(session, exerciseSessions, allExerciseSessions, allExerciseSets);
}

export async function getAddExerciseData(
	exerciseId: string,
	workoutSessionId: string
): Promise<{ lastSession: LastSessionData | null }> {
	const [allExerciseSessions, allExerciseSets] = await Promise.all([
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const setsByExerciseSessionId = buildExerciseSetsMap(allExerciseSets);
	const lastSession = getLastExerciseSessionData(
		exerciseId,
		allExerciseSessions,
		setsByExerciseSessionId,
		workoutSessionId
	);

	return { lastSession };
}

export async function getWorkoutProgressions(
	exerciseSessions: ExerciseSession[]
): Promise<Map<string, ProgressionResult>> {
	const [allExerciseSessions, allExerciseSets] = await Promise.all([
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const setsByExerciseSessionId = buildExerciseSetsMap(allExerciseSets);
	const progressions = new Map<string, ProgressionResult>();

	for (const exerciseSession of exerciseSessions) {
		const sessionSets = allExerciseSessions
			.filter((historicalSession) => historicalSession.exerciseId === exerciseSession.exerciseId)
			.filter((historicalSession) => historicalSession.completedAt !== null)
			.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
			.map((historicalSession) => setsByExerciseSessionId.get(historicalSession.id) ?? []);

		progressions.set(
			exerciseSession.id,
			getProgressionRecommendation(sessionSets, exerciseSession.repRangeUpper)
		);
	}

	return progressions;
}
