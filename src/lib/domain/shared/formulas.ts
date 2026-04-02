import type { ExerciseSet } from '$lib/models/types.js';

/** Epley formula — valid for 1–12 reps only. */
export function estimated1RM(weight: number, reps: number): number | null {
	if (reps <= 0 || reps > 12 || weight <= 0) return null;
	if (reps === 1) return weight;
	return weight * (1 + reps / 30);
}

export function completedVolume(sets: ExerciseSet[]): number {
	return sets.reduce((vol, set) => (set.isCompleted ? vol + set.weight * set.reps : vol), 0);
}
