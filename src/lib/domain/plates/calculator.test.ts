import { describe, expect, it } from 'vitest';
import { calculatePlates, findNearestAchievable } from './calculator.js';
import type { PlateConfig } from '$lib/models/types.js';

const baseConfig: PlateConfig = {
	barWeight: 20,
	plates: [{ weight: 20 }, { weight: 10 }, { weight: 5 }, { weight: 2.5 }, { weight: 1.25 }]
};

describe('calculatePlates', () => {
	it('returns the exact per-side breakdown for an achievable load', () => {
		expect(calculatePlates(100, baseConfig)).toEqual({
			perSide: [{ weight: 20, count: 2 }],
			totalWeight: 100,
			impossible: false,
			remainder: 0,
			belowBarWeight: false
		});
	});

	it('marks weights below the bar correctly', () => {
		expect(calculatePlates(15, baseConfig)).toEqual({
			perSide: [],
			totalWeight: 20,
			impossible: false,
			remainder: 0,
			belowBarWeight: true
		});
	});

	it('finds a combination when greedy would fail (63 kg with 15 kg bar)', () => {
		const config: PlateConfig = {
			barWeight: 15,
			plates: [
				{ weight: 15, quantity: 2 },
				{ weight: 5, quantity: 6 },
				{ weight: 2.5, quantity: 4 },
				{ weight: 1.25, quantity: 2 },
				{ weight: 0.5, quantity: 8 }
			]
		};
		const result = calculatePlates(63, config);
		expect(result.impossible).toBe(false);
		expect(result.totalWeight).toBe(63);
	});
});

describe('findNearestAchievable', () => {
	it('finds the nearest achievable values when plate quantities make the target impossible', () => {
		const limitedConfig: PlateConfig = {
			barWeight: 20,
			plates: [{ weight: 10, quantity: 2 }, { weight: 2.5, quantity: 2 }]
		};

		expect(calculatePlates(50, limitedConfig).impossible).toBe(true);
		expect(findNearestAchievable(50, limitedConfig)).toEqual({
			lower: 45,
			upper: 45
		});
	});
});
