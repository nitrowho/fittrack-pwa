import { getLastExerciseSessionData, getWorkoutStartData } from '$lib/application/workouts/queries.js';
import type { LastSessionData, WorkoutStateSnapshot } from '$lib/application/workouts/types.js';
import { createUuid } from '$lib/domain/shared/uuid.js';
import type { ExerciseSet, WorkoutSession, ExerciseSession, TemplateExercise } from '$lib/models/types.js';
import {
	addExerciseSet,
	createWorkoutSessionGraph,
	deleteExerciseSet,
	deleteWorkoutSession,
	finishWorkoutSession,
	listExerciseSetsByExerciseSessionId,
	updateExerciseSet,
	updateExerciseSets
} from '$lib/repositories/workout-repository.js';

function createSetsFromTemplate(
	templateExercise: TemplateExercise,
	exerciseSessionId: string,
	lastSession: LastSessionData | null
): ExerciseSet[] {
	const sets: ExerciseSet[] = [];

	for (let index = 0; index < templateExercise.targetSets; index++) {
		const lastSet = lastSession?.sets[index];
		sets.push({
			id: createUuid(),
			exerciseSessionId,
			setNumber: index + 1,
			weight: lastSet?.weight ?? 0,
			reps: lastSet?.reps ?? 0,
			rir: null,
			isCompleted: false,
			completedAt: null
		});
	}

	return sets;
}

function buildSetsMap(sets: ExerciseSet[]): Map<string, ExerciseSet[]> {
	return new Map(
		Array.from(
			sets.reduce((groups, set) => {
				const exerciseSets = groups.get(set.exerciseSessionId) ?? [];
				exerciseSets.push(set);
				groups.set(set.exerciseSessionId, exerciseSets);
				return groups;
			}, new Map<string, ExerciseSet[]>())
		).map(([exerciseSessionId, exerciseSets]) => [
			exerciseSessionId,
			exerciseSets.sort((a, b) => a.setNumber - b.setNumber)
		])
	);
}

export async function startWorkout(templateId: string): Promise<WorkoutStateSnapshot> {
	const { template, templateExercises, exerciseNames, allExerciseSessions, allExerciseSets } =
		await getWorkoutStartData(templateId);

	if (!template) {
		throw new Error('Vorlage nicht gefunden');
	}

	const sessionId = createUuid();
	const startedAt = new Date();
	const workoutSession: WorkoutSession = {
		id: sessionId,
		templateId,
		templateName: template.name,
		startedAt,
		completedAt: null,
		notes: ''
	};

	const existingSetsByExerciseSessionId = buildSetsMap(allExerciseSets);
	const exerciseSessions: ExerciseSession[] = [];
	const exerciseSets: ExerciseSet[] = [];
	const lastSessionData = new Map<string, LastSessionData | null>();

	for (const templateExercise of templateExercises) {
		const exerciseSessionId = createUuid();
		const exercise = exerciseNames.get(templateExercise.exerciseId);
		const priorSession = getLastExerciseSessionData(
			templateExercise.exerciseId,
			allExerciseSessions,
			existingSetsByExerciseSessionId
		);

		const exerciseSession: ExerciseSession = {
			id: exerciseSessionId,
			workoutSessionId: sessionId,
			exerciseId: templateExercise.exerciseId,
			exerciseName: exercise?.name ?? 'Unknown',
			muscleGroup: exercise?.muscleGroup ?? null,
			sortOrder: templateExercise.sortOrder,
			startedAt: null,
			completedAt: null,
			targetSets: templateExercise.targetSets,
			repRangeLower: templateExercise.repRangeLower,
			repRangeUpper: templateExercise.repRangeUpper,
			restDurationSeconds: templateExercise.restDurationSeconds
		};

		exerciseSessions.push(exerciseSession);
		lastSessionData.set(exerciseSessionId, priorSession);
		exerciseSets.push(...createSetsFromTemplate(templateExercise, exerciseSessionId, priorSession));
	}

	await createWorkoutSessionGraph(workoutSession, exerciseSessions, exerciseSets);

	return {
		session: workoutSession,
		exerciseSessions,
		sets: buildSetsMap(exerciseSets),
		lastSessionData
	};
}

export async function completeWorkoutSet(
	setId: string,
	weight: number,
	reps: number
): Promise<Date> {
	const completedAt = new Date();
	await updateExerciseSet(setId, {
		weight,
		reps,
		isCompleted: true,
		completedAt
	});
	return completedAt;
}

export async function uncompleteWorkoutSet(setId: string): Promise<void> {
	await updateExerciseSet(setId, {
		isCompleted: false,
		completedAt: null
	});
}

export async function updateWorkoutSet(
	setId: string,
	changes: Partial<ExerciseSet>
): Promise<void> {
	await updateExerciseSet(setId, changes);
}

export async function updateWorkoutSets(
	setIds: string[],
	changes: Partial<ExerciseSet>
): Promise<void> {
	await updateExerciseSets(setIds, changes);
}

export async function createWorkoutSet(input: {
	exerciseSessionId: string;
	setNumber: number;
	weight: number;
	reps: number;
}): Promise<ExerciseSet> {
	const exerciseSet: ExerciseSet = {
		id: createUuid(),
		exerciseSessionId: input.exerciseSessionId,
		setNumber: input.setNumber,
		weight: input.weight,
		reps: input.reps,
		rir: null,
		isCompleted: false,
		completedAt: null
	};

	await addExerciseSet(exerciseSet);
	return exerciseSet;
}

export async function removeWorkoutSet(setId: string): Promise<void> {
	await deleteExerciseSet(setId);
}

export async function finishWorkout(workoutSessionId: string): Promise<void> {
	await finishWorkoutSession(workoutSessionId, new Date());
}

export async function cancelWorkout(workoutSessionId: string): Promise<void> {
	await deleteWorkoutSession(workoutSessionId);
}

export async function applyWeightIncrease(
	exerciseSessionId: string,
	newWeight: number
): Promise<void> {
	const sets = await listExerciseSetsByExerciseSessionId(exerciseSessionId);
	const incompleteSetIds = sets.filter((set) => !set.isCompleted).map((set) => set.id);
	await updateExerciseSets(incompleteSetIds, { weight: newWeight });
}
