import type { PlateConfig, PlateResult } from '$lib/models/types.js';

export function calculatePlates(targetWeight: number, config: PlateConfig): PlateResult {
	if (targetWeight <= 0) {
		return {
			perSide: [],
			totalWeight: 0,
			impossible: false,
			remainder: 0,
			belowBarWeight: false
		};
	}

	if (targetWeight < config.barWeight) {
		return {
			perSide: [],
			totalWeight: config.barWeight,
			impossible: false,
			remainder: 0,
			belowBarWeight: true
		};
	}

	if (targetWeight === config.barWeight) {
		return {
			perSide: [],
			totalWeight: config.barWeight,
			impossible: false,
			remainder: 0,
			belowBarWeight: false
		};
	}

	const totalPlateWeight = targetWeight - config.barWeight;
	const perSideWeight = totalPlateWeight / 2;

	const sortedPlates = [...config.plates].sort((a, b) => b.weight - a.weight);

	const perSide: { weight: number; count: number }[] = [];
	let remaining = perSideWeight;

	for (const plate of sortedPlates) {
		if (plate.weight <= 0 || remaining <= 0) continue;

		const maxByWeight = Math.floor(remaining / plate.weight);
		const maxByQuantity =
			plate.quantity !== undefined ? Math.floor(plate.quantity / 2) : maxByWeight;
		const count = Math.min(maxByWeight, maxByQuantity);

		if (count > 0) {
			perSide.push({ weight: plate.weight, count });
			remaining = Math.round((remaining - count * plate.weight) * 1000) / 1000;
		}
	}

	const impossible = remaining > 0;
	const actualPlateWeight = perSideWeight - remaining;
	const totalWeight = config.barWeight + actualPlateWeight * 2;

	return {
		perSide,
		totalWeight: Math.round(totalWeight * 1000) / 1000,
		impossible,
		remainder: Math.round(remaining * 2 * 1000) / 1000,
		belowBarWeight: false
	};
}

export function findNearestAchievable(
	targetWeight: number,
	config: PlateConfig
): { lower: number; upper: number } {
	const step = 0.5;
	let lower = targetWeight;
	let upper = targetWeight;

	while (lower > config.barWeight) {
		lower -= step;
		const result = calculatePlates(lower, config);
		if (!result.impossible && !result.belowBarWeight) break;
	}
	if (lower <= config.barWeight) lower = config.barWeight;

	const maxWeight = config.barWeight + config.plates.reduce((sum, p) => {
		const qty = p.quantity !== undefined ? p.quantity : 100;
		return sum + p.weight * qty;
	}, 0);

	while (upper < maxWeight) {
		upper += step;
		const result = calculatePlates(upper, config);
		if (!result.impossible && !result.belowBarWeight) break;
	}

	return { lower, upper };
}
