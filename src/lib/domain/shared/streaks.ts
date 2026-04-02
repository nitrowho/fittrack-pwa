import { getWeekStart } from './date-helpers.js';

export function calculateStreaks(
	sessions: { startedAt: Date; completedAt: Date | null }[]
): { current: number; best: number } {
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
