import type { ExerciseSession, ExerciseSet, MuscleGroup, WorkoutSession } from '$lib/models/types.js';

export interface Achievement {
	id: string;
	icon: string;
	name: string;
	description: string;
	earned: boolean;
	earnedAt: Date | null;
	progress: number; // 0–1
	progressLabel: string;
}

interface AchievementInput {
	completedSessions: WorkoutSession[];
	exerciseSessions: ExerciseSession[];
	allSets: ExerciseSet[];
	currentStreak: number;
	bestStreak: number;
}

interface AchievementDef {
	id: string;
	icon: string;
	name: string;
	description: string;
	evaluate: (input: AchievementInput) => { earned: boolean; earnedAt: Date | null; progress: number; progressLabel: string };
}

function totalCompletedVolume(sets: ExerciseSet[]): number {
	return sets.reduce((vol, s) => (s.isCompleted ? vol + s.weight * s.reps : vol), 0);
}

function uniqueMuscleGroupsInWeek(
	sessions: WorkoutSession[],
	exerciseSessions: ExerciseSession[],
	weekStart: Date,
	weekEnd: Date
): Set<MuscleGroup> {
	const sessionIds = new Set(
		sessions
			.filter((s) => s.startedAt >= weekStart && s.startedAt <= weekEnd)
			.map((s) => s.id)
	);
	const groups = new Set<MuscleGroup>();
	for (const es of exerciseSessions) {
		if (sessionIds.has(es.workoutSessionId) && es.muscleGroup) {
			groups.add(es.muscleGroup);
		}
	}
	return groups;
}

function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? 6 : day - 1;
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function getWeekEnd(weekStart: Date): Date {
	const d = new Date(weekStart);
	d.setDate(d.getDate() + 6);
	d.setHours(23, 59, 59, 999);
	return d;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
	{
		id: 'first_workout',
		icon: '💪',
		name: 'Erster Schritt',
		description: 'Schließe dein erstes Workout ab',
		evaluate: ({ completedSessions }) => {
			const earned = completedSessions.length >= 1;
			return {
				earned,
				earnedAt: earned ? completedSessions[completedSessions.length - 1].completedAt : null,
				progress: Math.min(1, completedSessions.length),
				progressLabel: `${Math.min(1, completedSessions.length)}/1`
			};
		}
	},
	{
		id: '10_workouts',
		icon: '🏋️',
		name: 'Regelmäßig',
		description: 'Schließe 10 Workouts ab',
		evaluate: ({ completedSessions }) => {
			const count = completedSessions.length;
			const earned = count >= 10;
			return {
				earned,
				earnedAt: earned ? completedSessions[completedSessions.length - 10]?.completedAt ?? null : null,
				progress: Math.min(1, count / 10),
				progressLabel: `${Math.min(count, 10)}/10`
			};
		}
	},
	{
		id: '50_workouts',
		icon: '🔥',
		name: 'Feuer und Flamme',
		description: 'Schließe 50 Workouts ab',
		evaluate: ({ completedSessions }) => {
			const count = completedSessions.length;
			const earned = count >= 50;
			return {
				earned,
				earnedAt: earned ? completedSessions[completedSessions.length - 50]?.completedAt ?? null : null,
				progress: Math.min(1, count / 50),
				progressLabel: `${Math.min(count, 50)}/50`
			};
		}
	},
	{
		id: '100_workouts',
		icon: '🏆',
		name: 'Centurion',
		description: 'Schließe 100 Workouts ab',
		evaluate: ({ completedSessions }) => {
			const count = completedSessions.length;
			const earned = count >= 100;
			return {
				earned,
				earnedAt: earned ? completedSessions[completedSessions.length - 100]?.completedAt ?? null : null,
				progress: Math.min(1, count / 100),
				progressLabel: `${Math.min(count, 100)}/100`
			};
		}
	},
	{
		id: 'volume_10k',
		icon: '📦',
		name: '10 Tonnen',
		description: 'Bewege insgesamt 10.000 kg',
		evaluate: ({ allSets }) => {
			const vol = totalCompletedVolume(allSets);
			const earned = vol >= 10_000;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, vol / 10_000),
				progressLabel: `${Math.round(vol).toLocaleString('de-DE')}/${(10_000).toLocaleString('de-DE')} kg`
			};
		}
	},
	{
		id: 'volume_100k',
		icon: '🚛',
		name: '100 Tonnen',
		description: 'Bewege insgesamt 100.000 kg',
		evaluate: ({ allSets }) => {
			const vol = totalCompletedVolume(allSets);
			const earned = vol >= 100_000;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, vol / 100_000),
				progressLabel: `${Math.round(vol).toLocaleString('de-DE')}/${(100_000).toLocaleString('de-DE')} kg`
			};
		}
	},
	{
		id: 'volume_1m',
		icon: '🏗️',
		name: 'Mega-Mover',
		description: 'Bewege insgesamt 1.000.000 kg',
		evaluate: ({ allSets }) => {
			const vol = totalCompletedVolume(allSets);
			const earned = vol >= 1_000_000;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, vol / 1_000_000),
				progressLabel: `${Math.round(vol).toLocaleString('de-DE')}/${(1_000_000).toLocaleString('de-DE')} kg`
			};
		}
	},
	{
		id: 'all_muscles_week',
		icon: '🎯',
		name: 'Ganzkörper',
		description: 'Trainiere alle 5 Muskelgruppen in einer Woche',
		evaluate: ({ completedSessions, exerciseSessions }) => {
			let best = 0;
			const weeks = new Set<string>();
			for (const s of completedSessions) {
				const ws = getWeekStart(s.startedAt);
				weeks.add(ws.toISOString());
			}
			for (const wsIso of weeks) {
				const ws = new Date(wsIso);
				const we = getWeekEnd(ws);
				const groups = uniqueMuscleGroupsInWeek(completedSessions, exerciseSessions, ws, we);
				if (groups.size > best) best = groups.size;
				if (best >= 5) break;
			}
			const earned = best >= 5;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, best / 5),
				progressLabel: `${best}/5 Muskelgruppen`
			};
		}
	},
	{
		id: 'streak_4',
		icon: '📅',
		name: 'Monats-Serie',
		description: 'Halte eine 4-Wochen-Serie',
		evaluate: ({ bestStreak }) => {
			const earned = bestStreak >= 4;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, bestStreak / 4),
				progressLabel: `${Math.min(bestStreak, 4)}/4 Wochen`
			};
		}
	},
	{
		id: 'streak_12',
		icon: '⚡',
		name: 'Quartal-Serie',
		description: 'Halte eine 12-Wochen-Serie',
		evaluate: ({ bestStreak }) => {
			const earned = bestStreak >= 12;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, bestStreak / 12),
				progressLabel: `${Math.min(bestStreak, 12)}/12 Wochen`
			};
		}
	},
	{
		id: 'streak_26',
		icon: '👑',
		name: 'Halbjahres-Serie',
		description: 'Halte eine 26-Wochen-Serie',
		evaluate: ({ bestStreak }) => {
			const earned = bestStreak >= 26;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, bestStreak / 26),
				progressLabel: `${Math.min(bestStreak, 26)}/26 Wochen`
			};
		}
	},
	{
		id: 'early_bird',
		icon: '🌅',
		name: 'Frühaufsteher',
		description: 'Starte ein Workout vor 7:00 Uhr',
		evaluate: ({ completedSessions }) => {
			const earlySession = completedSessions.find((s) => s.startedAt.getHours() < 7);
			return {
				earned: !!earlySession,
				earnedAt: earlySession?.completedAt ?? null,
				progress: earlySession ? 1 : 0,
				progressLabel: earlySession ? 'Geschafft' : 'Noch offen'
			};
		}
	},
	{
		id: 'bodyweight_club',
		icon: '🎖️',
		name: 'Bodyweight-Club',
		description: 'Hebe 80 kg oder mehr in einem Satz',
		evaluate: ({ allSets }) => {
			const best = allSets.reduce((max, s) => (s.isCompleted && s.weight > max ? s.weight : max), 0);
			const earned = best >= 80;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, best / 80),
				progressLabel: `${Math.round(best)}/${80} kg`
			};
		}
	},
	{
		id: 'plate_club',
		icon: '🥇',
		name: '100-kg-Club',
		description: 'Hebe 100 kg oder mehr in einem Satz',
		evaluate: ({ allSets }) => {
			const best = allSets.reduce((max, s) => (s.isCompleted && s.weight > max ? s.weight : max), 0);
			const earned = best >= 100;
			return {
				earned,
				earnedAt: null,
				progress: Math.min(1, best / 100),
				progressLabel: `${Math.round(best)}/${100} kg`
			};
		}
	}
];

export function evaluateAchievements(input: AchievementInput): Achievement[] {
	return ACHIEVEMENT_DEFS.map((def) => {
		const result = def.evaluate(input);
		return {
			id: def.id,
			icon: def.icon,
			name: def.name,
			description: def.description,
			...result
		};
	});
}
