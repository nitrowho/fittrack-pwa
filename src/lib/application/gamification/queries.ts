import { evaluateAchievements, type Achievement } from '$lib/domain/gamification/achievements.js';
import { generateProgressInsights, type ProgressInsight } from '$lib/domain/gamification/progress-insights.js';
import { calculateStreaks } from '$lib/domain/shared/streaks.js';
import {
	listWorkoutSessions,
	listAllExerciseSessions,
	listAllExerciseSets
} from '$lib/repositories/workout-repository.js';
import type { ExerciseSet } from '$lib/models/types.js';

export type { Achievement, ProgressInsight };

export interface GamificationData {
	achievements: Achievement[];
	progressInsights: ProgressInsight[];
}

export async function getGamificationData(): Promise<GamificationData> {
	const [sessions, exerciseSessions, allSets] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const completedSessions = sessions
		.filter((s) => s.completedAt !== null)
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

	const { current: currentStreak, best: bestStreak } = calculateStreaks(completedSessions);

	const setsByExerciseSession = new Map<string, ExerciseSet[]>();
	for (const set of allSets) {
		const list = setsByExerciseSession.get(set.exerciseSessionId) ?? [];
		list.push(set);
		setsByExerciseSession.set(set.exerciseSessionId, list);
	}

	const achievements = evaluateAchievements({
		completedSessions,
		exerciseSessions,
		allSets,
		currentStreak,
		bestStreak
	});

	const progressInsights = generateProgressInsights(
		completedSessions,
		exerciseSessions,
		setsByExerciseSession
	);

	return { achievements, progressInsights };
}
