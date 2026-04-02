import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';

export interface ProgressInsight {
	exerciseName: string;
	type: 'e1rm_improvement' | 'volume_improvement' | 'consistency';
	message: string;
	percentChange: number;
}

function estimated1RM(weight: number, reps: number): number | null {
	if (reps <= 0 || reps > 12 || weight <= 0) return null;
	if (reps === 1) return weight;
	return weight * (1 + reps / 30);
}

/**
 * Generate progress insight cards by comparing the recent period (last 4 weeks)
 * against the prior period (4–12 weeks ago).
 */
export function generateProgressInsights(
	completedSessions: WorkoutSession[],
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): ProgressInsight[] {
	const now = new Date();
	const recentCutoff = new Date(now);
	recentCutoff.setDate(recentCutoff.getDate() - 28); // last 4 weeks
	const priorCutoff = new Date(now);
	priorCutoff.setDate(priorCutoff.getDate() - 84); // 12 weeks ago

	const sessionDates = new Map(completedSessions.map((s) => [s.id, s.startedAt]));

	// Group exercise sessions by exerciseId with their dates
	const byExercise = new Map<string, { name: string; recent: ExerciseSession[]; prior: ExerciseSession[] }>();

	for (const es of exerciseSessions) {
		const date = sessionDates.get(es.workoutSessionId);
		if (!date) continue;

		const group = byExercise.get(es.exerciseId) ?? { name: es.exerciseName, recent: [], prior: [] };
		if (date >= recentCutoff) {
			group.recent.push(es);
		} else if (date >= priorCutoff) {
			group.prior.push(es);
		}
		byExercise.set(es.exerciseId, group);
	}

	const insights: ProgressInsight[] = [];

	for (const [, group] of byExercise) {
		// Need data in both periods to compare
		if (group.recent.length === 0 || group.prior.length === 0) continue;

		// Best e1RM in each period
		const recentBest = bestE1RM(group.recent, setsByExerciseSession);
		const priorBest = bestE1RM(group.prior, setsByExerciseSession);

		if (recentBest !== null && priorBest !== null && priorBest > 0) {
			const change = ((recentBest - priorBest) / priorBest) * 100;
			if (change >= 5) {
				insights.push({
					exerciseName: group.name,
					type: 'e1rm_improvement',
					message: `Dein ${group.name} e1RM hat sich um ${Math.round(change)}% verbessert`,
					percentChange: Math.round(change)
				});
			}
		}
	}

	// Sort by biggest improvement first
	insights.sort((a, b) => b.percentChange - a.percentChange);

	// Limit to top 3 insights
	return insights.slice(0, 3);
}

function bestE1RM(
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): number | null {
	let best: number | null = null;
	for (const es of exerciseSessions) {
		const sets = setsByExerciseSession.get(es.id) ?? [];
		for (const s of sets) {
			if (!s.isCompleted || s.weight <= 0) continue;
			const e = estimated1RM(s.weight, s.reps);
			if (e !== null && (best === null || e > best)) {
				best = e;
			}
		}
	}
	return best;
}
