import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';
import {
	getPeriodLabel,
	getStatisticsOverviewData,
	getStatisticsPeriodData
} from './queries.js';
import {
	listCompletedWorkoutSessionsByStartedAtRange,
	listExerciseSessionsByWorkoutSessionIds,
	listExerciseSetsByExerciseSessionIds,
	listWorkoutSessions
} from '$lib/repositories/workout-repository.js';

vi.mock('$lib/repositories/workout-repository.js', () => ({
	listCompletedWorkoutSessionsByStartedAtRange: vi.fn(),
	listExerciseSessionsByWorkoutSessionIds: vi.fn(),
	listExerciseSetsByExerciseSessionIds: vi.fn(),
	listWorkoutSessions: vi.fn()
}));

function createCompletedSession(id: string, startedAt: string, completedAt: string): WorkoutSession {
	return {
		id,
		templateId: 'template-1',
		templateName: 'Workout A',
		startedAt: new Date(startedAt),
		completedAt: new Date(completedAt),
		notes: ''
	};
}

function createExerciseSession(
	id: string,
	workoutSessionId: string,
	exerciseId: string,
	exerciseName: string,
	muscleGroup: ExerciseSession['muscleGroup']
): ExerciseSession {
	return {
		id,
		workoutSessionId,
		exerciseId,
		exerciseName,
		muscleGroup,
		sortOrder: 0,
		startedAt: null,
		completedAt: new Date(),
		targetSets: 3,
		repRangeLower: 8,
		repRangeUpper: 12,
		restDurationSeconds: 90
	};
}

function createSet(
	id: string,
	exerciseSessionId: string,
	weight: number,
	reps: number,
	setNumber: number
): ExerciseSet {
	return {
		id,
		exerciseSessionId,
		setNumber,
		weight,
		reps,
		rir: null,
		isCompleted: true,
		completedAt: new Date()
	};
}

describe('statistics queries', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		vi.clearAllMocks();
	});

	it('formats week and month labels against the current date', () => {
		expect(getPeriodLabel('week', 0)).toBe('30.3. – 5.4.');
		expect(getPeriodLabel('month', 0)).toBe('Apr 2026');
	});

	it('loads period-scoped statistics with the requested date range', async () => {
		const session = createCompletedSession('ws-1', '2026-03-31T08:00:00.000Z', '2026-03-31T09:00:00.000Z');
		const exerciseSession = createExerciseSession('es-1', session.id, 'bench', 'Bankdrücken', 'brust');
		const set = createSet('set-1', exerciseSession.id, 80, 10, 1);

		vi.mocked(listCompletedWorkoutSessionsByStartedAtRange).mockResolvedValue([session]);
		vi.mocked(listExerciseSessionsByWorkoutSessionIds).mockResolvedValue([exerciseSession]);
		vi.mocked(listExerciseSetsByExerciseSessionIds).mockResolvedValue([set]);

		const result = await getStatisticsPeriodData('week', 0);

		expect(listCompletedWorkoutSessionsByStartedAtRange).toHaveBeenCalledWith(
			new Date('2026-03-29T22:00:00.000Z'),
			new Date('2026-04-05T21:59:59.999Z')
		);
		expect(result.workoutCount).toBe(1);
		expect(result.totalVolume).toBe(800);
		expect(result.averageDuration).toBe(3600);
		expect(result.muscleGroupDistribution).toEqual([
			{
				muscleGroup: 'brust',
				label: 'Brust',
				volume: 800,
				percentage: 100
			}
		]);
	});

	it('computes overview statistics from all completed sessions', async () => {
		const sessions = [
			createCompletedSession('ws-1', '2026-03-31T08:00:00.000Z', '2026-03-31T09:00:00.000Z'),
			createCompletedSession('ws-2', '2026-03-24T08:00:00.000Z', '2026-03-24T09:00:00.000Z')
		];
		const exerciseSessions = [
			createExerciseSession('es-1', 'ws-1', 'bench', 'Bankdrücken', 'brust'),
			createExerciseSession('es-2', 'ws-2', 'bench', 'Bankdrücken', 'brust')
		];
		const sets = [
			createSet('set-1', 'es-1', 80, 8, 1),
			createSet('set-2', 'es-2', 75, 8, 1)
		];

		vi.mocked(listWorkoutSessions).mockResolvedValue(sessions);
		vi.mocked(listExerciseSessionsByWorkoutSessionIds).mockResolvedValue(exerciseSessions);
		vi.mocked(listExerciseSetsByExerciseSessionIds).mockResolvedValue(sets);

		const result = await getStatisticsOverviewData();

		expect(result.currentStreak).toBe(2);
		expect(result.bestStreak).toBe(2);
		expect(result.personalRecords[0]).toMatchObject({
			exerciseId: 'bench',
			exerciseName: 'Bankdrücken',
			bestWeight: 80
		});
		expect(result.e1rmHistory[0].history).toHaveLength(2);
	});
});
