import type { ExerciseSession, ExerciseSet, MuscleGroup, WorkoutSession } from '$lib/models/types.js';
import { MUSCLE_GROUP_LABELS } from '$lib/models/types.js';
import {
	listWorkoutSessions,
	listAllExerciseSessions,
	listAllExerciseSets
} from '$lib/repositories/workout-repository.js';

export type StatsPeriod = 'week' | 'month' | 'all';

export interface VolumeTrendPoint {
	label: string;
	volume: number;
}

export interface MuscleGroupStat {
	muscleGroup: MuscleGroup;
	label: string;
	volume: number;
	percentage: number;
}

export interface PersonalRecord {
	exerciseId: string;
	exerciseName: string;
	bestWeight: number;
	bestEstimated1RM: number | null;
	bestSetReps: number;
	bestSetWeight: number;
}

export interface StatisticsData {
	workoutCount: number;
	totalVolume: number;
	averageDuration: number;
	currentStreak: number;
	bestStreak: number;
	volumeTrend: VolumeTrendPoint[];
	muscleGroupDistribution: MuscleGroupStat[];
	personalRecords: PersonalRecord[];
	e1rmHistory: E1RMHistoryExercise[];
}

export interface E1RMHistoryPoint {
	date: Date;
	label: string;
	estimated1RM: number;
}

export interface E1RMHistoryExercise {
	exerciseId: string;
	exerciseName: string;
	history: E1RMHistoryPoint[];
}

export interface DashboardStats {
	workoutsThisWeek: number;
	volumeThisWeek: number;
	currentStreak: number;
}

// --- Date helpers ---

function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = day === 0 ? 6 : day - 1; // Monday = start of week
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

function getMonthStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getPeriodRange(period: StatsPeriod, offset: number = 0): { start: Date; end: Date } {
	const now = new Date();
	switch (period) {
		case 'week': {
			const base = getWeekStart(now);
			base.setDate(base.getDate() + offset * 7);
			return { start: base, end: getWeekEnd(base) };
		}
		case 'month': {
			const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
			return { start: getMonthStart(base), end: getMonthEnd(base) };
		}
		case 'all':
			return { start: new Date(0), end: now };
	}
}

export function getPeriodLabel(period: StatsPeriod, offset: number): string {
	const now = new Date();
	if (period === 'week') {
		const base = getWeekStart(now);
		base.setDate(base.getDate() + offset * 7);
		const end = getWeekEnd(base);
		const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;
		return `${fmt(base)} – ${fmt(end)}`;
	}
	if (period === 'month') {
		const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
		return `${MONTH_LABELS_SHORT[base.getMonth()]} ${base.getFullYear()}`;
	}
	return 'Gesamt';
}

// --- Volume helpers ---

function completedVolume(sets: ExerciseSet[]): number {
	return sets.reduce((vol, s) => (s.isCompleted ? vol + s.weight * s.reps : vol), 0);
}

function sessionVolume(
	sessionId: string,
	exercisesBySession: Map<string, ExerciseSession[]>,
	setsByExerciseSession: Map<string, ExerciseSet[]>
): number {
	const exercises = exercisesBySession.get(sessionId) ?? [];
	return exercises.reduce(
		(vol, ex) => vol + completedVolume(setsByExerciseSession.get(ex.id) ?? []),
		0
	);
}

// --- 1RM (Epley) ---

function estimated1RM(weight: number, reps: number): number | null {
	if (reps <= 0 || reps > 12 || weight <= 0) return null;
	if (reps === 1) return weight;
	return weight * (1 + reps / 30);
}

// --- Streak calculation ---

function calculateStreaks(sessions: WorkoutSession[]): { current: number; best: number } {
	if (sessions.length === 0) return { current: 0, best: 0 };

	const weekKeys = new Set<string>();
	for (const s of sessions) {
		if (!s.completedAt) continue;
		const ws = getWeekStart(s.startedAt);
		weekKeys.add(`${ws.getFullYear()}-${ws.getMonth()}-${ws.getDate()}`);
	}

	if (weekKeys.size === 0) return { current: 0, best: 0 };

	// Walk backwards from current week
	const now = new Date();
	let ws = getWeekStart(now);
	let current = 0;
	let best = 0;
	let streak = 0;
	let isCurrentStreak = true;

	// Check up to 200 weeks back
	for (let i = 0; i < 200; i++) {
		const key = `${ws.getFullYear()}-${ws.getMonth()}-${ws.getDate()}`;
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
		ws = new Date(ws);
		ws.setDate(ws.getDate() - 7);
	}

	if (isCurrentStreak) current = streak;
	return { current, best };
}

// --- Volume trend ---

const DAY_LABELS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTH_LABELS_SHORT = [
	'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
	'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

function calculateVolumeTrend(
	period: StatsPeriod,
	sessions: WorkoutSession[],
	exercisesBySession: Map<string, ExerciseSession[]>,
	setsByExerciseSession: Map<string, ExerciseSet[]>,
	periodStart: Date,
	periodEnd: Date
): VolumeTrendPoint[] {
	if (period === 'week') {
		const weekStart = periodStart;
		const points: VolumeTrendPoint[] = DAY_LABELS_SHORT.map((label) => ({ label, volume: 0 }));

		for (const s of sessions) {
			if (!s.completedAt) continue;
			const dayOffset = Math.floor(
				(s.startedAt.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
			);
			if (dayOffset >= 0 && dayOffset < 7) {
				points[dayOffset].volume += sessionVolume(s.id, exercisesBySession, setsByExerciseSession);
			}
		}
		return points;
	}

	if (period === 'month') {
		const monthStart = periodStart;
		const monthEnd = periodEnd;
		const weekBuckets: VolumeTrendPoint[] = [];

		// Create weekly buckets within the month
		let bucketStart = getWeekStart(monthStart);
		if (bucketStart < monthStart) bucketStart = new Date(monthStart);

		let weekNum = 1;
		while (bucketStart <= monthEnd) {
			const bucketEnd = new Date(
				Math.min(getWeekEnd(bucketStart).getTime(), monthEnd.getTime())
			);
			weekBuckets.push({ label: `KW ${weekNum}`, volume: 0 });

			for (const s of sessions) {
				if (!s.completedAt) continue;
				if (s.startedAt >= bucketStart && s.startedAt <= bucketEnd) {
					weekBuckets[weekBuckets.length - 1].volume += sessionVolume(
						s.id,
						exercisesBySession,
						setsByExerciseSession
					);
				}
			}

			bucketStart = new Date(bucketEnd);
			bucketStart.setDate(bucketStart.getDate() + 1);
			bucketStart.setHours(0, 0, 0, 0);
			weekNum++;
		}
		return weekBuckets;
	}

	// All time: per month
	if (sessions.length === 0) return [];

	const completed = sessions.filter((s) => s.completedAt);
	if (completed.length === 0) return [];

	const earliest = completed.reduce(
		(min, s) => (s.startedAt < min ? s.startedAt : min),
		completed[0].startedAt
	);
	const now = new Date();
	const points: VolumeTrendPoint[] = [];

	let year = earliest.getFullYear();
	let month = earliest.getMonth();

	while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {
		const mStart = new Date(year, month, 1);
		const mEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
		let vol = 0;

		for (const s of completed) {
			if (s.startedAt >= mStart && s.startedAt <= mEnd) {
				vol += sessionVolume(s.id, exercisesBySession, setsByExerciseSession);
			}
		}

		points.push({ label: `${MONTH_LABELS_SHORT[month]} ${year.toString().slice(2)}`, volume: vol });

		month++;
		if (month > 11) {
			month = 0;
			year++;
		}
	}
	return points;
}

// --- Muscle group distribution ---

function calculateMuscleDistribution(
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): MuscleGroupStat[] {
	const volumeByGroup = new Map<MuscleGroup, number>();

	for (const es of exerciseSessions) {
		if (!es.muscleGroup) continue;
		const vol = completedVolume(setsByExerciseSession.get(es.id) ?? []);
		volumeByGroup.set(es.muscleGroup, (volumeByGroup.get(es.muscleGroup) ?? 0) + vol);
	}

	const totalVolume = Array.from(volumeByGroup.values()).reduce((a, b) => a + b, 0);
	if (totalVolume === 0) return [];

	return Array.from(volumeByGroup.entries())
		.map(([mg, volume]) => ({
			muscleGroup: mg,
			label: MUSCLE_GROUP_LABELS[mg],
			volume,
			percentage: Math.round((volume / totalVolume) * 100)
		}))
		.sort((a, b) => b.volume - a.volume);
}

// --- Personal records ---

function calculatePersonalRecords(
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): PersonalRecord[] {
	const records = new Map<
		string,
		{ exerciseName: string; bestWeight: number; best1RM: number | null; bestSetReps: number; bestSetWeight: number }
	>();

	for (const es of exerciseSessions) {
		const sets = setsByExerciseSession.get(es.id) ?? [];
		for (const set of sets) {
			if (!set.isCompleted || set.weight <= 0) continue;

			const existing = records.get(es.exerciseId);
			const e1rm = estimated1RM(set.weight, set.reps);

			if (!existing) {
				records.set(es.exerciseId, {
					exerciseName: es.exerciseName,
					bestWeight: set.weight,
					best1RM: e1rm,
					bestSetReps: set.reps,
					bestSetWeight: set.weight
				});
			} else {
				if (set.weight > existing.bestWeight) {
					existing.bestWeight = set.weight;
				}
				if (e1rm !== null && (existing.best1RM === null || e1rm > existing.best1RM)) {
					existing.best1RM = e1rm;
					existing.bestSetReps = set.reps;
					existing.bestSetWeight = set.weight;
				}
			}
		}
	}

	return Array.from(records.entries())
		.map(([exerciseId, r]) => ({
			exerciseId,
			exerciseName: r.exerciseName,
			bestWeight: r.bestWeight,
			bestEstimated1RM: r.best1RM,
			bestSetReps: r.bestSetReps,
			bestSetWeight: r.bestSetWeight
		}))
		.sort((a, b) => (b.bestEstimated1RM ?? 0) - (a.bestEstimated1RM ?? 0));
}

// --- e1RM history ---

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' });

function calculateE1RMHistory(
	completedSessions: WorkoutSession[],
	exerciseSessions: ExerciseSession[],
	setsByExerciseSession: Map<string, ExerciseSet[]>
): E1RMHistoryExercise[] {
	// Group exercise sessions by exerciseId
	const byExercise = new Map<string, { exerciseName: string; entries: { date: Date; sessionId: string; esId: string }[] }>();

	for (const es of exerciseSessions) {
		const session = completedSessions.find((s) => s.id === es.workoutSessionId);
		if (!session) continue;

		let group = byExercise.get(es.exerciseId);
		if (!group) {
			group = { exerciseName: es.exerciseName, entries: [] };
			byExercise.set(es.exerciseId, group);
		}
		group.entries.push({ date: session.startedAt, sessionId: session.id, esId: es.id });
	}

	const results: E1RMHistoryExercise[] = [];

	for (const [exerciseId, group] of byExercise) {
		// Sort entries by date
		group.entries.sort((a, b) => a.date.getTime() - b.date.getTime());

		const history: E1RMHistoryPoint[] = [];

		for (const entry of group.entries) {
			const sets = setsByExerciseSession.get(entry.esId) ?? [];
			let best1RM: number | null = null;

			for (const set of sets) {
				if (!set.isCompleted || set.weight <= 0) continue;
				const e1rm = estimated1RM(set.weight, set.reps);
				if (e1rm !== null && (best1RM === null || e1rm > best1RM)) {
					best1RM = e1rm;
				}
			}

			if (best1RM !== null) {
				history.push({
					date: entry.date,
					label: SHORT_DATE_FORMAT.format(entry.date),
					estimated1RM: Math.round(best1RM * 10) / 10
				});
			}
		}

		if (history.length >= 2) {
			results.push({ exerciseId, exerciseName: group.exerciseName, history });
		}
	}

	// Sort by highest latest e1RM
	results.sort((a, b) => {
		const aLast = a.history[a.history.length - 1].estimated1RM;
		const bLast = b.history[b.history.length - 1].estimated1RM;
		return bLast - aLast;
	});

	return results;
}

// --- Main queries ---

async function loadAllData() {
	const [sessions, exerciseSessions, sets] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const exercisesBySession = new Map<string, ExerciseSession[]>();
	for (const es of exerciseSessions) {
		const list = exercisesBySession.get(es.workoutSessionId) ?? [];
		list.push(es);
		exercisesBySession.set(es.workoutSessionId, list);
	}

	const setsByExerciseSession = new Map<string, ExerciseSet[]>();
	for (const s of sets) {
		const list = setsByExerciseSession.get(s.exerciseSessionId) ?? [];
		list.push(s);
		setsByExerciseSession.set(s.exerciseSessionId, list);
	}

	const completedSessions = sessions
		.filter((s) => s.completedAt !== null)
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

	return { completedSessions, exerciseSessions, exercisesBySession, setsByExerciseSession };
}

export async function getStatisticsData(period: StatsPeriod, offset: number = 0): Promise<StatisticsData> {
	const { completedSessions, exerciseSessions, exercisesBySession, setsByExerciseSession } =
		await loadAllData();

	const { start, end } = getPeriodRange(period, offset);
	const periodSessions = completedSessions.filter(
		(s) => s.startedAt >= start && s.startedAt <= end
	);

	const periodExerciseSessions = exerciseSessions.filter((es) => {
		const session = completedSessions.find((s) => s.id === es.workoutSessionId);
		return session && session.startedAt >= start && session.startedAt <= end;
	});

	// Workout count
	const workoutCount = periodSessions.length;

	// Total volume
	const totalVolume = periodSessions.reduce(
		(vol, s) => vol + sessionVolume(s.id, exercisesBySession, setsByExerciseSession),
		0
	);

	// Average duration
	const durations = periodSessions
		.filter((s) => s.completedAt)
		.map((s) => (s.completedAt!.getTime() - s.startedAt.getTime()) / 1000);
	const averageDuration =
		durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

	// Streaks (always computed from all sessions)
	const { current: currentStreak, best: bestStreak } = calculateStreaks(completedSessions);

	// Volume trend
	const volumeTrend = calculateVolumeTrend(
		period,
		periodSessions,
		exercisesBySession,
		setsByExerciseSession,
		start,
		end
	);

	// Muscle group distribution (period-scoped)
	const muscleGroupDistribution = calculateMuscleDistribution(
		periodExerciseSessions,
		setsByExerciseSession
	);

	// Personal records (always all-time)
	const personalRecords = calculatePersonalRecords(exerciseSessions, setsByExerciseSession);

	// e1RM history (always all-time)
	const e1rmHistory = calculateE1RMHistory(completedSessions, exerciseSessions, setsByExerciseSession);

	return {
		workoutCount,
		totalVolume,
		averageDuration,
		currentStreak,
		bestStreak,
		volumeTrend,
		muscleGroupDistribution,
		personalRecords,
		e1rmHistory
	};
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const { completedSessions, exercisesBySession, setsByExerciseSession } = await loadAllData();

	const weekStart = getWeekStart(new Date());
	const weekEnd = getWeekEnd(weekStart);

	const weekSessions = completedSessions.filter(
		(s) => s.startedAt >= weekStart && s.startedAt <= weekEnd
	);

	const volumeThisWeek = weekSessions.reduce(
		(vol, s) => vol + sessionVolume(s.id, exercisesBySession, setsByExerciseSession),
		0
	);

	const { current: currentStreak } = calculateStreaks(completedSessions);

	return {
		workoutsThisWeek: weekSessions.length,
		volumeThisWeek,
		currentStreak
	};
}
