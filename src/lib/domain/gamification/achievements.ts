import type { ExerciseSession, ExerciseSet, MuscleGroup, WorkoutSession } from '$lib/models/types.js';
import { getWeekStart, getWeekEnd } from '$lib/domain/shared/date-helpers.js';
import { completedVolume } from '$lib/domain/shared/formulas.js';

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

// --- Factory helpers for common achievement patterns ---

function workoutCountAchievement(
	id: string, icon: string, name: string, description: string, threshold: number
): AchievementDef {
	return {
		id, icon, name, description,
		evaluate: ({ completedSessions }) => {
			const count = completedSessions.length;
			return {
				earned: count >= threshold,
				earnedAt: count >= threshold ? completedSessions[completedSessions.length - threshold]?.completedAt ?? null : null,
				progress: Math.min(1, count / threshold),
				progressLabel: `${Math.min(count, threshold)}/${threshold}`
			};
		}
	};
}

function volumeAchievement(
	id: string, icon: string, name: string, description: string, threshold: number
): AchievementDef {
	return {
		id, icon, name, description,
		evaluate: ({ allSets }) => {
			const vol = completedVolume(allSets);
			return {
				earned: vol >= threshold,
				earnedAt: null,
				progress: Math.min(1, vol / threshold),
				progressLabel: `${Math.round(vol).toLocaleString('de-DE')}/${threshold.toLocaleString('de-DE')} kg`
			};
		}
	};
}

function streakAchievement(
	id: string, icon: string, name: string, description: string, threshold: number
): AchievementDef {
	return {
		id, icon, name, description,
		evaluate: ({ bestStreak }) => ({
			earned: bestStreak >= threshold,
			earnedAt: null,
			progress: Math.min(1, bestStreak / threshold),
			progressLabel: `${Math.min(bestStreak, threshold)}/${threshold} Wochen`
		})
	};
}

function maxWeightAchievement(
	id: string, icon: string, name: string, description: string, threshold: number
): AchievementDef {
	return {
		id, icon, name, description,
		evaluate: ({ allSets }) => {
			const best = allSets.reduce((max, s) => (s.isCompleted && s.weight > max ? s.weight : max), 0);
			return {
				earned: best >= threshold,
				earnedAt: null,
				progress: Math.min(1, best / threshold),
				progressLabel: `${Math.round(best)}/${threshold} kg`
			};
		}
	};
}

// --- One-off achievements ---

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

const ACHIEVEMENT_DEFS: AchievementDef[] = [
	workoutCountAchievement('first_workout', '💪', 'Erster Schritt', 'Schließe dein erstes Workout ab', 1),
	workoutCountAchievement('10_workouts', '🏋️', 'Regelmäßig', 'Schließe 10 Workouts ab', 10),
	workoutCountAchievement('50_workouts', '🔥', 'Feuer und Flamme', 'Schließe 50 Workouts ab', 50),
	workoutCountAchievement('100_workouts', '🏆', 'Centurion', 'Schließe 100 Workouts ab', 100),
	volumeAchievement('volume_10k', '📦', '10 Tonnen', 'Bewege insgesamt 10.000 kg', 10_000),
	volumeAchievement('volume_100k', '🚛', '100 Tonnen', 'Bewege insgesamt 100.000 kg', 100_000),
	volumeAchievement('volume_1m', '🏗️', 'Mega-Mover', 'Bewege insgesamt 1.000.000 kg', 1_000_000),
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
			return {
				earned: best >= 5,
				earnedAt: null,
				progress: Math.min(1, best / 5),
				progressLabel: `${best}/5 Muskelgruppen`
			};
		}
	},
	streakAchievement('streak_4', '📅', 'Monats-Serie', 'Halte eine 4-Wochen-Serie', 4),
	streakAchievement('streak_12', '⚡', 'Quartal-Serie', 'Halte eine 12-Wochen-Serie', 12),
	streakAchievement('streak_26', '👑', 'Halbjahres-Serie', 'Halte eine 26-Wochen-Serie', 26),
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
	maxWeightAchievement('bodyweight_club', '🎖️', 'Bodyweight-Club', 'Hebe 80 kg oder mehr in einem Satz', 80),
	maxWeightAchievement('plate_club', '🥇', '100-kg-Club', 'Hebe 100 kg oder mehr in einem Satz', 100)
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
