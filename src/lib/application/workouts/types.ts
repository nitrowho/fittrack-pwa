import type { ExerciseSession, ExerciseSet, WorkoutSession } from '$lib/models/types.js';

export interface LastSessionData {
	session: ExerciseSession;
	sets: ExerciseSet[];
}

export interface WorkoutStateSnapshot {
	session: WorkoutSession;
	exerciseSessions: ExerciseSession[];
	sets: Map<string, ExerciseSet[]>;
	lastSessionData: Map<string, LastSessionData | null>;
}
