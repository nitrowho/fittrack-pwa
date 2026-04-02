import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';
import { estimated1RM } from '$lib/domain/shared/formulas.js';

export interface ProgressInsight {
	exerciseName: string;
	type: 'e1rm_improvement' | 'volume_improvement' | 'consistency';
	message: string;
	percentChange: number;
}

const RECENT_PERIOD_DAYS = 28;
const PRIOR_PERIOD_DAYS = 84;
const MIN_IMPROVEMENT_PERCENT = 5;
const MAX_INSIGHTS = 3;

export function generateProgressInsights(
	completedSessions: WorkoutSession[],
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): ProgressInsight[] {
	const now = new Date();
	const recentCutoff = new Date(now);
	recentCutoff.setDate(recentCutoff.getDate() - RECENT_PERIOD_DAYS);
	const priorCutoff = new Date(now);
	priorCutoff.setDate(priorCutoff.getDate() - PRIOR_PERIOD_DAYS);

	const sessionDates = new Map(completedSessions.map((s) => [s.id, s.startedAt]));
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
		if (group.recent.length === 0 || group.prior.length === 0) continue;

		const recentBest = bestE1RM(group.recent, setsByExerciseSession);
		const priorBest = bestE1RM(group.prior, setsByExerciseSession);

		if (recentBest !== null && priorBest !== null && priorBest > 0) {
			const change = ((recentBest - priorBest) / priorBest) * 100;
			if (change >= MIN_IMPROVEMENT_PERCENT) {
				insights.push({
					exerciseName: group.name,
					type: 'e1rm_improvement',
					message: `Dein ${group.name} e1RM hat sich um ${Math.round(change)}% verbessert`,
					percentChange: Math.round(change)
				});
			}
		}
	}

	insights.sort((a, b) => b.percentChange - a.percentChange);
	return insights.slice(0, MAX_INSIGHTS);
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
