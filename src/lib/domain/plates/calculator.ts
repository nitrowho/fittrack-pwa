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

	// Convert to integer milligrams to avoid floating-point issues
	const targetMg = Math.round(perSideWeight * 1000);

	const plateDefs = sortedPlates
		.filter((p) => p.weight > 0)
		.map((p) => ({
			weightMg: Math.round(p.weight * 1000),
			weight: p.weight,
			maxPerSide:
				p.quantity !== undefined
					? Math.floor(p.quantity / 2)
					: Math.floor(targetMg / Math.round(p.weight * 1000))
		}));

	// Bounded knapsack DP to find exact plate combination
	const dp = new Uint8Array(targetMg + 1);
	const from = new Int32Array(targetMg + 1).fill(-1);
	const fromPlate = new Int32Array(targetMg + 1).fill(-1);
	dp[0] = 1;

	for (let i = 0; i < plateDefs.length; i++) {
		const { weightMg, maxPerSide } = plateDefs[i];
		if (weightMg <= 0 || maxPerSide <= 0) continue;

		for (let unit = 0; unit < maxPerSide; unit++) {
			for (let w = targetMg; w >= weightMg; w--) {
				if (dp[w - weightMg] && !dp[w]) {
					dp[w] = 1;
					from[w] = w - weightMg;
					fromPlate[w] = i;
				}
			}
		}
	}

	if (dp[targetMg]) {
		const counts = new Array(plateDefs.length).fill(0);
		let w = targetMg;
		while (w > 0) {
			counts[fromPlate[w]]++;
			w = from[w];
		}

		const perSide = plateDefs
			.map((p, i) => ({ weight: p.weight, count: counts[i] as number }))
			.filter((p) => p.count > 0);

		return {
			perSide,
			totalWeight: targetWeight,
			impossible: false,
			remainder: 0,
			belowBarWeight: false
		};
	}

	// Target not achievable — find what we could reach
	let bestMg = 0;
	for (let w = targetMg - 1; w >= 0; w--) {
		if (dp[w]) {
			bestMg = w;
			break;
		}
	}
	const remaining = (targetMg - bestMg) / 1000;
	const actualPlateWeight = bestMg / 1000;
	const totalWeight = config.barWeight + actualPlateWeight * 2;

	// Reconstruct the closest achievable breakdown
	const fallbackCounts = new Array(plateDefs.length).fill(0);
	let fw = bestMg;
	while (fw > 0) {
		fallbackCounts[fromPlate[fw]]++;
		fw = from[fw];
	}
	const perSide = plateDefs
		.map((p, i) => ({ weight: p.weight, count: fallbackCounts[i] as number }))
		.filter((p) => p.count > 0);

	return {
		perSide,
		totalWeight: Math.round(totalWeight * 1000) / 1000,
		impossible: true,
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

	let foundUpper = false;
	while (upper < maxWeight) {
		upper += step;
		const result = calculatePlates(upper, config);
		if (!result.impossible && !result.belowBarWeight) {
			foundUpper = true;
			break;
		}
	}

	if (!foundUpper) {
		upper = lower;
	}

	return { lower, upper };
}
