import { db } from '$lib/db/database.js';

export type ProgressionResult =
	| { type: 'increase'; newWeight: number }
	| { type: 'stagnation'; sessionCount: number }
	| { type: 'none' };

export async function getProgressionRecommendation(
	exerciseId: string,
	repRangeUpper: number
): Promise<ProgressionResult> {
	// Get all completed exercise sessions for this exercise, newest first
	const sessions = await db.exerciseSessions
		.where('exerciseId')
		.equals(exerciseId)
		.toArray();

	// Filter to only sessions with a completedAt, then sort newest first
	const completedSessions = sessions
		.filter((s) => s.completedAt !== null)
		.sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()));

	if (completedSessions.length === 0) return { type: 'none' };

	const latest = completedSessions[0];
	const latestSets = await db.exerciseSets
		.where('exerciseSessionId')
		.equals(latest.id)
		.toArray();

	const completedSets = latestSets.filter((s) => s.isCompleted);
	if (completedSets.length === 0) return { type: 'none' };

	// Check if all completed sets hit the upper rep range
	const allHitUpper = completedSets.every((s) => s.reps >= repRangeUpper);
	if (allHitUpper) {
		const currentWeight = Math.max(...completedSets.map((s) => s.weight));
		return { type: 'increase', newWeight: currentWeight + 1.0 };
	}

	// Check for stagnation: same weight and max reps for 3+ consecutive sessions
	if (completedSessions.length >= 3) {
		const latestWeight = Math.max(...completedSets.map((s) => s.weight));
		const latestMaxReps = Math.max(...completedSets.map((s) => s.reps));
		let stagnationCount = 1;

		for (let i = 1; i < completedSessions.length; i++) {
			const sets = await db.exerciseSets
				.where('exerciseSessionId')
				.equals(completedSessions[i].id)
				.toArray();
			const completed = sets.filter((s) => s.isCompleted);
			if (completed.length === 0) break;

			const weight = Math.max(...completed.map((s) => s.weight));
			const maxReps = Math.max(...completed.map((s) => s.reps));

			if (weight === latestWeight && maxReps === latestMaxReps) {
				stagnationCount++;
			} else {
				break;
			}
		}

		if (stagnationCount >= 3) {
			return { type: 'stagnation', sessionCount: stagnationCount };
		}
	}

	return { type: 'none' };
}

export async function applyWeightIncrease(
	exerciseSessionId: string,
	newWeight: number
): Promise<void> {
	const sets = await db.exerciseSets
		.where('exerciseSessionId')
		.equals(exerciseSessionId)
		.toArray();

	const incompleteSets = sets.filter((s) => !s.isCompleted);
	await db.transaction('rw', db.exerciseSets, async () => {
		for (const set of incompleteSets) {
			await db.exerciseSets.update(set.id, { weight: newWeight });
		}
	});
}
