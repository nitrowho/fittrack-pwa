import type { ExerciseSet } from '$lib/models/types.js';
import { estimated1RM } from '$lib/domain/shared/formulas.js';

export type PRType = 'weight' | 'reps' | 'volume' | 'e1rm';

export interface DetectedPR {
	type: PRType;
	label: string;
	value: number;
	previousValue: number;
}

export function detectPRs(
	completedWeight: number,
	completedReps: number,
	historicalSets: ExerciseSet[]
): DetectedPR[] {
	if (completedWeight <= 0 || completedReps <= 0) return [];

	const prior = historicalSets.filter((s) => s.isCompleted && s.weight > 0 && s.reps > 0);
	if (prior.length === 0) return [];

	const prs: DetectedPR[] = [];

	const bestWeight = Math.max(...prior.map((s) => s.weight));
	if (completedWeight > bestWeight) {
		prs.push({
			type: 'weight',
			label: 'Gewichts-PR',
			value: completedWeight,
			previousValue: bestWeight
		});
	}

	const setsAtWeight = prior.filter((s) => s.weight >= completedWeight);
	if (setsAtWeight.length > 0) {
		const bestReps = Math.max(...setsAtWeight.map((s) => s.reps));
		if (completedReps > bestReps) {
			prs.push({
				type: 'reps',
				label: 'Wiederholungs-PR',
				value: completedReps,
				previousValue: bestReps
			});
		}
	}

	const currentVolume = completedWeight * completedReps;
	const bestVolume = Math.max(...prior.map((s) => s.weight * s.reps));
	if (currentVolume > bestVolume) {
		prs.push({
			type: 'volume',
			label: 'Volumen-PR',
			value: currentVolume,
			previousValue: bestVolume
		});
	}

	const currentE1RM = estimated1RM(completedWeight, completedReps);
	if (currentE1RM !== null) {
		const bestE1RM = prior.reduce((best, s) => {
			const e = estimated1RM(s.weight, s.reps);
			return e !== null && e > best ? e : best;
		}, 0);
		if (bestE1RM > 0 && currentE1RM > bestE1RM) {
			prs.push({
				type: 'e1rm',
				label: 'e1RM-PR',
				value: Math.round(currentE1RM * 10) / 10,
				previousValue: Math.round(bestE1RM * 10) / 10
			});
		}
	}

	return prs;
}
