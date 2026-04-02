import { describe, expect, it } from 'vitest';
import { getProgressionRecommendation } from './progression.js';
import type { ExerciseSet } from '$lib/models/types.js';

function createSet(weight: number, reps: number, isCompleted: boolean = true): ExerciseSet {
	return {
		id: crypto.randomUUID(),
		exerciseSessionId: crypto.randomUUID(),
		setNumber: 1,
		weight,
		reps,
		rir: null,
		isCompleted,
		completedAt: isCompleted ? new Date() : null
	};
}

describe('getProgressionRecommendation', () => {
	it('recommends an increase when all completed sets reach the upper rep range', () => {
		const result = getProgressionRecommendation(
			[
				[createSet(80, 12), createSet(80, 12), createSet(80, 12)],
				[createSet(80, 11), createSet(80, 10), createSet(80, 10)]
			],
			12
		);

		expect(result).toEqual({ type: 'increase', newWeight: 81 });
	});

	it('flags stagnation after three matching completed sessions', () => {
		const result = getProgressionRecommendation(
			[
				[createSet(85, 8), createSet(85, 8)],
				[createSet(85, 8), createSet(85, 8)],
				[createSet(85, 8), createSet(85, 8)],
				[createSet(82.5, 9), createSet(82.5, 8)]
			],
			10
		);

		expect(result).toEqual({ type: 'stagnation', sessionCount: 3 });
	});

	it('returns none when there is not enough completed history', () => {
		const result = getProgressionRecommendation(
			[
				[createSet(60, 10, false), createSet(60, 10, false)],
				[createSet(60, 9)]
			],
			12
		);

		expect(result).toEqual({ type: 'none' });
	});
});
