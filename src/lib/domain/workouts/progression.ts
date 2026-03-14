import type { ExerciseSet } from '$lib/models/types.js';

export type ProgressionResult =
	| { type: 'increase'; newWeight: number }
	| { type: 'stagnation'; sessionCount: number }
	| { type: 'none' };

function getCompletedSets(sets: ExerciseSet[]): ExerciseSet[] {
	return sets.filter((set) => set.isCompleted);
}

export function getProgressionRecommendation(
	sessionSets: ExerciseSet[][],
	repRangeUpper: number
): ProgressionResult {
	const completedSessions = sessionSets
		.map((sets) => getCompletedSets(sets))
		.filter((sets) => sets.length > 0);

	if (completedSessions.length === 0) {
		return { type: 'none' };
	}

	const latestSets = completedSessions[0];
	const allHitUpper = latestSets.every((set) => set.reps >= repRangeUpper);
	if (allHitUpper) {
		const currentWeight = Math.max(...latestSets.map((set) => set.weight));
		return { type: 'increase', newWeight: currentWeight + 1.0 };
	}

	if (completedSessions.length < 3) {
		return { type: 'none' };
	}

	const latestWeight = Math.max(...latestSets.map((set) => set.weight));
	const latestMaxReps = Math.max(...latestSets.map((set) => set.reps));
	let stagnationCount = 1;

	for (let index = 1; index < completedSessions.length; index++) {
		const sets = completedSessions[index];
		const weight = Math.max(...sets.map((set) => set.weight));
		const maxReps = Math.max(...sets.map((set) => set.reps));

		if (weight === latestWeight && maxReps === latestMaxReps) {
			stagnationCount++;
			continue;
		}

		break;
	}

	if (stagnationCount >= 3) {
		return { type: 'stagnation', sessionCount: stagnationCount };
	}

	return { type: 'none' };
}
