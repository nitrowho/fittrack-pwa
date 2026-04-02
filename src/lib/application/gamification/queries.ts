import { evaluateAchievements, type Achievement } from '$lib/domain/gamification/achievements.js';
import {
	listWorkoutSessions,
	listAllExerciseSessions,
	listAllExerciseSets
} from '$lib/repositories/workout-repository.js';

export type { Achievement };

export async function getAchievements(): Promise<Achievement[]> {
	const [sessions, exerciseSessions, allSets] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const completedSessions = sessions
		.filter((s) => s.completedAt !== null)
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

	// Calculate streaks (same logic as statistics)
	const { current: currentStreak, best: bestStreak } = calculateStreaks(completedSessions);

	return evaluateAchievements({
		completedSessions,
		exerciseSessions,
		allSets,
		currentStreak,
		bestStreak
	});
}

function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? 6 : day - 1;
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function calculateStreaks(sessions: { startedAt: Date; completedAt: Date | null }[]): { current: number; best: number } {
	if (sessions.length === 0) return { current: 0, best: 0 };

	const weekKeys = new Set<string>();
	for (const session of sessions) {
		if (!session.completedAt) continue;
		const weekStart = getWeekStart(session.startedAt);
		weekKeys.add(`${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`);
	}

	if (weekKeys.size === 0) return { current: 0, best: 0 };

	const now = new Date();
	let weekStart = getWeekStart(now);
	let current = 0;
	let best = 0;
	let streak = 0;
	let isCurrentStreak = true;

	for (let index = 0; index < 200; index++) {
		const key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
		if (weekKeys.has(key)) {
			streak++;
			if (streak > best) best = streak;
		} else {
			if (isCurrentStreak) {
				current = streak;
				isCurrentStreak = false;
			}
			streak = 0;
		}
		weekStart = new Date(weekStart);
		weekStart.setDate(weekStart.getDate() - 7);
	}

	if (isCurrentStreak) current = streak;
	return { current, best };
}
