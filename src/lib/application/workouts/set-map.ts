import type { ExerciseSet } from '$lib/models/types.js';

const setMapCache = new WeakMap<ExerciseSet[], Map<string, ExerciseSet[]>>();

export function buildExerciseSetsMap(sets: ExerciseSet[]): Map<string, ExerciseSet[]> {
	const cached = setMapCache.get(sets);
	if (cached) {
		return cached;
	}

	const setsByExerciseSessionId = new Map<string, ExerciseSet[]>();

	for (const set of sets) {
		const exerciseSets = setsByExerciseSessionId.get(set.exerciseSessionId) ?? [];
		exerciseSets.push(set);
		setsByExerciseSessionId.set(set.exerciseSessionId, exerciseSets);
	}

	for (const [exerciseSessionId, exerciseSets] of setsByExerciseSessionId) {
		setsByExerciseSessionId.set(
			exerciseSessionId,
			exerciseSets.sort((a, b) => a.setNumber - b.setNumber)
		);
	}

	setMapCache.set(sets, setsByExerciseSessionId);
	return setsByExerciseSessionId;
}
