import type { ExerciseSession, ExerciseSet, MuscleGroup, WorkoutSession } from '$lib/models/types.js';
import { MUSCLE_GROUP_LABELS } from '$lib/models/types.js';
import {
	listCompletedWorkoutSessionsByStartedAtRange,
	listExerciseSessionsByWorkoutSessionIds,
	listExerciseSetsByExerciseSessionIds,
	listWorkoutSessions
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

export interface StatisticsPeriodData {
	workoutCount: number;
	totalVolume: number;
	averageDuration: number;
	volumeTrend: VolumeTrendPoint[];
	muscleGroupDistribution: MuscleGroupStat[];
}

export interface StatisticsOverviewData {
	currentStreak: number;
	bestStreak: number;
	personalRecords: PersonalRecord[];
	e1rmHistory: E1RMHistoryExercise[];
}

export interface StatisticsData extends StatisticsPeriodData, StatisticsOverviewData {}

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
	bestStreak: number;
}

interface StatisticsCollection {
	completedSessions: WorkoutSession[];
	exerciseSessions: ExerciseSession[];
	exercisesBySession: Map<string, ExerciseSession[]>;
	setsByExerciseSession: Map<string, ExerciseSet[]>;
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
	return sets.reduce((vol, set) => (set.isCompleted ? vol + set.weight * set.reps : vol), 0);
}

function sessionVolume(
	sessionId: string,
	exercisesBySession: Map<string, ExerciseSession[]>,
	setsByExerciseSession: Map<string, ExerciseSet[]>
): number {
	const exercises = exercisesBySession.get(sessionId) ?? [];
	return exercises.reduce(
		(vol, exerciseSession) =>
			vol + completedVolume(setsByExerciseSession.get(exerciseSession.id) ?? []),
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

// --- Volume trend ---

const DAY_LABELS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function calculateVolumeTrend(
	period: StatsPeriod,
	sessions: WorkoutSession[],
	exercisesBySession: Map<string, ExerciseSession[]>,
	setsByExerciseSession: Map<string, ExerciseSet[]>,
	periodStart: Date,
	periodEnd: Date
): VolumeTrendPoint[] {
	if (period === 'week') {
		const points: VolumeTrendPoint[] = DAY_LABELS_SHORT.map((label) => ({ label, volume: 0 }));

		for (const session of sessions) {
			if (!session.completedAt) continue;
			const dayOffset = Math.floor(
				(session.startedAt.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
			);
			if (dayOffset >= 0 && dayOffset < 7) {
				points[dayOffset].volume += sessionVolume(
					session.id,
					exercisesBySession,
					setsByExerciseSession
				);
			}
		}

		return points;
	}

	if (period === 'month') {
		const weekBuckets: VolumeTrendPoint[] = [];
		let bucketStart = getWeekStart(periodStart);
		if (bucketStart < periodStart) bucketStart = new Date(periodStart);

		let weekNumber = 1;
		while (bucketStart <= periodEnd) {
			const bucketEnd = new Date(
				Math.min(getWeekEnd(bucketStart).getTime(), periodEnd.getTime())
			);
			weekBuckets.push({ label: `KW ${weekNumber}`, volume: 0 });

			for (const session of sessions) {
				if (!session.completedAt) continue;
				if (session.startedAt >= bucketStart && session.startedAt <= bucketEnd) {
					weekBuckets[weekBuckets.length - 1].volume += sessionVolume(
						session.id,
						exercisesBySession,
						setsByExerciseSession
					);
				}
			}

			bucketStart = new Date(bucketEnd);
			bucketStart.setDate(bucketStart.getDate() + 1);
			bucketStart.setHours(0, 0, 0, 0);
			weekNumber++;
		}

		return weekBuckets;
	}

	if (sessions.length === 0) return [];

	const earliest = sessions.reduce(
		(min, session) => (session.startedAt < min ? session.startedAt : min),
		sessions[0].startedAt
	);
	const now = new Date();
	const points: VolumeTrendPoint[] = [];

	let year = earliest.getFullYear();
	let month = earliest.getMonth();

	while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {
		const monthStart = new Date(year, month, 1);
		const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
		let volume = 0;

		for (const session of sessions) {
			if (session.startedAt >= monthStart && session.startedAt <= monthEnd) {
				volume += sessionVolume(session.id, exercisesBySession, setsByExerciseSession);
			}
		}

		points.push({
			label: `${MONTH_LABELS_SHORT[month]} ${year.toString().slice(2)}`,
			volume
		});

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

	for (const exerciseSession of exerciseSessions) {
		if (!exerciseSession.muscleGroup) continue;
		const volume = completedVolume(setsByExerciseSession.get(exerciseSession.id) ?? []);
		volumeByGroup.set(
			exerciseSession.muscleGroup,
			(volumeByGroup.get(exerciseSession.muscleGroup) ?? 0) + volume
		);
	}

	const totalVolume = Array.from(volumeByGroup.values()).reduce((sum, volume) => sum + volume, 0);
	if (totalVolume === 0) return [];

	return Array.from(volumeByGroup.entries())
		.map(([muscleGroup, volume]) => ({
			muscleGroup,
			label: MUSCLE_GROUP_LABELS[muscleGroup],
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
		{
			exerciseName: string;
			bestWeight: number;
			best1RM: number | null;
			bestSetReps: number;
			bestSetWeight: number;
		}
	>();

	for (const exerciseSession of exerciseSessions) {
		const sets = setsByExerciseSession.get(exerciseSession.id) ?? [];
		for (const set of sets) {
			if (!set.isCompleted || set.weight <= 0) continue;

			const existing = records.get(exerciseSession.exerciseId);
			const e1rm = estimated1RM(set.weight, set.reps);

			if (!existing) {
				records.set(exerciseSession.exerciseId, {
					exerciseName: exerciseSession.exerciseName,
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
		.map(([exerciseId, record]) => ({
			exerciseId,
			exerciseName: record.exerciseName,
			bestWeight: record.bestWeight,
			bestEstimated1RM: record.best1RM,
			bestSetReps: record.bestSetReps,
			bestSetWeight: record.bestSetWeight
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
	const sessionsById = new Map(completedSessions.map((session) => [session.id, session]));
	const byExercise = new Map<
		string,
		{ exerciseName: string; entries: { date: Date; sessionId: string; exerciseSessionId: string }[] }
	>();

	for (const exerciseSession of exerciseSessions) {
		const session = sessionsById.get(exerciseSession.workoutSessionId);
		if (!session) continue;

		const group = byExercise.get(exerciseSession.exerciseId) ?? {
			exerciseName: exerciseSession.exerciseName,
			entries: []
		};
		group.entries.push({
			date: session.startedAt,
			sessionId: session.id,
			exerciseSessionId: exerciseSession.id
		});
		byExercise.set(exerciseSession.exerciseId, group);
	}

	const results: E1RMHistoryExercise[] = [];

	for (const [exerciseId, group] of byExercise) {
		group.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
		const history: E1RMHistoryPoint[] = [];

		for (const entry of group.entries) {
			const sets = setsByExerciseSession.get(entry.exerciseSessionId) ?? [];
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

	results.sort((a, b) => {
		const aLast = a.history[a.history.length - 1].estimated1RM;
		const bLast = b.history[b.history.length - 1].estimated1RM;
		return bLast - aLast;
	});

	return results;
}

// --- Collection loaders ---

function sortCompletedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
	return sessions
		.filter((session) => session.completedAt !== null)
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

function buildStatisticsCollection(
	completedSessions: WorkoutSession[],
	exerciseSessions: ExerciseSession[],
	sets: ExerciseSet[]
): StatisticsCollection {
	const exercisesBySession = new Map<string, ExerciseSession[]>();
	for (const exerciseSession of exerciseSessions) {
		const list = exercisesBySession.get(exerciseSession.workoutSessionId) ?? [];
		list.push(exerciseSession);
		exercisesBySession.set(exerciseSession.workoutSessionId, list);
	}

	const setsByExerciseSession = new Map<string, ExerciseSet[]>();
	for (const set of sets) {
		const list = setsByExerciseSession.get(set.exerciseSessionId) ?? [];
		list.push(set);
		setsByExerciseSession.set(set.exerciseSessionId, list);
	}

	return { completedSessions, exerciseSessions, exercisesBySession, setsByExerciseSession };
}

async function loadCollectionForSessions(
	completedSessions: WorkoutSession[]
): Promise<StatisticsCollection> {
	const workoutSessionIds = completedSessions.map((session) => session.id);
	const exerciseSessions = await listExerciseSessionsByWorkoutSessionIds(workoutSessionIds);
	const exerciseSessionIds = exerciseSessions.map((exerciseSession) => exerciseSession.id);
	const sets = await listExerciseSetsByExerciseSessionIds(exerciseSessionIds);

	return buildStatisticsCollection(completedSessions, exerciseSessions, sets);
}

async function loadAllTimeCollection(): Promise<StatisticsCollection> {
	const completedSessions = sortCompletedSessions(await listWorkoutSessions());
	return loadCollectionForSessions(completedSessions);
}

async function loadPeriodCollection(
	period: StatsPeriod,
	offset: number
): Promise<StatisticsCollection> {
	if (period === 'all') {
		return loadAllTimeCollection();
	}

	const { start, end } = getPeriodRange(period, offset);
	const completedSessions = sortCompletedSessions(
		await listCompletedWorkoutSessionsByStartedAtRange(start, end)
	);
	return loadCollectionForSessions(completedSessions);
}

// --- Main queries ---

export async function getStatisticsPeriodData(
	period: StatsPeriod,
	offset: number = 0
): Promise<StatisticsPeriodData> {
	const { start, end } = getPeriodRange(period, offset);
	const { completedSessions, exerciseSessions, exercisesBySession, setsByExerciseSession } =
		await loadPeriodCollection(period, offset);

	const workoutCount = completedSessions.length;
	const totalVolume = completedSessions.reduce(
		(volume, session) =>
			volume + sessionVolume(session.id, exercisesBySession, setsByExerciseSession),
		0
	);
	const durations = completedSessions
		.filter((session) => session.completedAt)
		.map((session) => (session.completedAt!.getTime() - session.startedAt.getTime()) / 1000);
	const averageDuration =
		durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;

	return {
		workoutCount,
		totalVolume,
		averageDuration,
		volumeTrend: calculateVolumeTrend(
			period,
			completedSessions,
			exercisesBySession,
			setsByExerciseSession,
			start,
			end
		),
		muscleGroupDistribution: calculateMuscleDistribution(exerciseSessions, setsByExerciseSession)
	};
}

export async function getStatisticsOverviewData(): Promise<StatisticsOverviewData> {
	const { completedSessions, exerciseSessions, setsByExerciseSession } = await loadAllTimeCollection();
	const { current: currentStreak, best: bestStreak } = calculateStreaks(completedSessions);

	return {
		currentStreak,
		bestStreak,
		personalRecords: calculatePersonalRecords(exerciseSessions, setsByExerciseSession),
		e1rmHistory: calculateE1RMHistory(completedSessions, exerciseSessions, setsByExerciseSession)
	};
}

export async function getStatisticsData(period: StatsPeriod, offset: number = 0): Promise<StatisticsData> {
	const [periodData, overviewData] = await Promise.all([
		getStatisticsPeriodData(period, offset),
		getStatisticsOverviewData()
	]);

	return {
		...periodData,
		...overviewData
	};
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const weekStart = getWeekStart(new Date());
	const weekEnd = getWeekEnd(weekStart);
	const weekSessions = sortCompletedSessions(
		await listCompletedWorkoutSessionsByStartedAtRange(weekStart, weekEnd)
	);
	const { exercisesBySession, setsByExerciseSession } = await loadCollectionForSessions(weekSessions);
	const { current: currentStreak, best: bestStreak } = calculateStreaks(sortCompletedSessions(await listWorkoutSessions()));

	return {
		workoutsThisWeek: weekSessions.length,
		volumeThisWeek: weekSessions.reduce(
			(volume, session) =>
				volume + sessionVolume(session.id, exercisesBySession, setsByExerciseSession),
			0
		),
		currentStreak,
		bestStreak
	};
}
