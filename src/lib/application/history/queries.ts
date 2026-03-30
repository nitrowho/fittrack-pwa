import type { ExerciseSession, ExerciseSet, MuscleGroup, WorkoutSession } from '$lib/models/types.js';
import {
	getWorkoutSession,
	listAllExerciseSessions,
	listAllExerciseSets,
	listExerciseSessionsByWorkoutSessionId,
	listWorkoutSessions
} from '$lib/repositories/workout-repository.js';
import { toDateKey } from './calendar.js';

export interface HistorySessionListItem {
	session: WorkoutSession;
	volume: number;
}

export interface HistoryExerciseSessionDetail {
	exerciseSession: ExerciseSession;
	sets: ExerciseSet[];
}

export interface HistorySessionDetail {
	session: WorkoutSession;
	exerciseSessions: HistoryExerciseSessionDetail[];
	totalVolume: number;
	duration: number;
}

export interface CalendarDayData {
	sessionCount: number;
	muscleGroups: MuscleGroup[];
}

export async function getCalendarMonthData(
	year: number,
	month: number
): Promise<Map<string, CalendarDayData>> {
	const [sessions, exerciseSessions] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions()
	]);

	const monthStart = new Date(year, month, 1);
	const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

	const completedInMonth = sessions.filter(
		(s) =>
			s.completedAt !== null &&
			s.startedAt >= monthStart &&
			s.startedAt <= monthEnd
	);

	const exercisesBySession = new Map<string, ExerciseSession[]>();
	for (const es of exerciseSessions) {
		const list = exercisesBySession.get(es.workoutSessionId) ?? [];
		list.push(es);
		exercisesBySession.set(es.workoutSessionId, list);
	}

	const result = new Map<string, CalendarDayData>();

	for (const session of completedInMonth) {
		const key = toDateKey(session.startedAt);
		const existing = result.get(key) ?? { sessionCount: 0, muscleGroups: [] };
		existing.sessionCount++;

		const sessionExercises = exercisesBySession.get(session.id) ?? [];
		for (const ex of sessionExercises) {
			if (ex.muscleGroup && !existing.muscleGroups.includes(ex.muscleGroup)) {
				existing.muscleGroups.push(ex.muscleGroup);
			}
		}

		result.set(key, existing);
	}

	return result;
}

function calculateCompletedVolume(sets: ExerciseSet[]): number {
	return sets.reduce((volume, set) => {
		if (!set.isCompleted) {
			return volume;
		}

		return volume + set.weight * set.reps;
	}, 0);
}

export async function listHistorySessions(): Promise<HistorySessionListItem[]> {
	const [sessions, exerciseSessions, exerciseSets] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const setsByExerciseSessionId = new Map<string, ExerciseSet[]>();
	for (const exerciseSet of exerciseSets) {
		const sets = setsByExerciseSessionId.get(exerciseSet.exerciseSessionId) ?? [];
		sets.push(exerciseSet);
		setsByExerciseSessionId.set(exerciseSet.exerciseSessionId, sets);
	}

	const volumeByWorkoutSessionId = new Map<string, number>();
	for (const exerciseSession of exerciseSessions) {
		const sessionVolume = calculateCompletedVolume(
			setsByExerciseSessionId.get(exerciseSession.id) ?? []
		);
		volumeByWorkoutSessionId.set(
			exerciseSession.workoutSessionId,
			(volumeByWorkoutSessionId.get(exerciseSession.workoutSessionId) ?? 0) + sessionVolume
		);
	}

	return sessions
		.filter((session) => session.completedAt !== null)
		.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
		.map((session) => ({
			session,
			volume: volumeByWorkoutSessionId.get(session.id) ?? 0
		}));
}

export async function getHistorySessionDetail(
	id: string
): Promise<HistorySessionDetail | null> {
	const [session, exerciseSessions, exerciseSets] = await Promise.all([
		getWorkoutSession(id),
		listExerciseSessionsByWorkoutSessionId(id),
		listAllExerciseSets()
	]);

	if (!session) {
		return null;
	}

	const setsByExerciseSessionId = new Map<string, ExerciseSet[]>();
	for (const exerciseSet of exerciseSets) {
		const sets = setsByExerciseSessionId.get(exerciseSet.exerciseSessionId) ?? [];
		sets.push(exerciseSet);
		setsByExerciseSessionId.set(exerciseSet.exerciseSessionId, sets);
	}

	const detailedExerciseSessions = exerciseSessions.map((exerciseSession) => ({
		exerciseSession,
		sets: (setsByExerciseSessionId.get(exerciseSession.id) ?? []).sort(
			(a, b) => a.setNumber - b.setNumber
		)
	}));

	const totalVolume = detailedExerciseSessions.reduce(
		(volume, entry) => volume + calculateCompletedVolume(entry.sets),
		0
	);

	return {
		session,
		exerciseSessions: detailedExerciseSessions,
		totalVolume,
		duration: session.completedAt
			? (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
			: 0
	};
}
