export type MuscleGroup = 'ruecken' | 'beine' | 'brust' | 'arme' | 'schulter';

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
	ruecken: 'Rücken',
	beine: 'Beine',
	brust: 'Brust',
	arme: 'Arme',
	schulter: 'Schulter'
};

export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
	ruecken: 'var(--color-muscle-ruecken)',
	beine: 'var(--color-muscle-beine)',
	brust: 'var(--color-muscle-brust)',
	arme: 'var(--color-muscle-arme)',
	schulter: 'var(--color-muscle-schulter)'
};

export interface Exercise {
	id: string;
	name: string;
	muscleGroup: MuscleGroup | null;
	isBarbell: boolean;
}

export interface PlateDefinition {
	weight: number;
	quantity?: number;
}

export interface PlateConfig {
	barWeight: number;
	plates: PlateDefinition[];
}

export interface PlateResult {
	perSide: { weight: number; count: number }[];
	totalWeight: number;
	impossible: boolean;
	remainder: number;
	belowBarWeight: boolean;
}

export interface WorkoutTemplate {
	id: string;
	name: string;
	sortOrder: number;
	createdAt: Date;
}

export interface TemplateExercise {
	id: string;
	templateId: string;
	exerciseId: string;
	sortOrder: number;
	targetSets: number;
	repRangeLower: number;
	repRangeUpper: number;
	restDurationSeconds: number;
}

export interface WorkoutSession {
	id: string;
	templateId: string | null;
	templateName: string;
	startedAt: Date;
	completedAt: Date | null;
	notes: string;
}

export interface ExerciseSession {
	id: string;
	workoutSessionId: string;
	exerciseId: string;
	exerciseName: string;
	muscleGroup: MuscleGroup | null;
	sortOrder: number;
	startedAt: Date | null;
	completedAt: Date | null;
	targetSets: number;
	repRangeLower: number;
	repRangeUpper: number;
	restDurationSeconds: number;
}

export interface ExerciseSet {
	id: string;
	exerciseSessionId: string;
	setNumber: number;
	weight: number;
	reps: number;
	rir: number | null;
	isCompleted: boolean;
	completedAt: Date | null;
}
