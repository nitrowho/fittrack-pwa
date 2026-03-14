import type { Exercise, MuscleGroup, WorkoutTemplate } from '$lib/models/types.js';

export interface TemplateExerciseInput {
	exerciseId: string;
	targetSets: number;
	repRangeLower: number;
	repRangeUpper: number;
	restDurationSeconds: number;
}

export interface TemplateSummary {
	template: WorkoutTemplate;
	exerciseCount: number;
}

export interface TemplateDetailExercise extends TemplateExerciseInput {
	id: string;
	exercise: Exercise | null;
}

export interface TemplateEditorData {
	template: WorkoutTemplate;
	availableExercises: Exercise[];
	selectedExercises: TemplateExerciseInput[];
}

export interface TemplateFormExercise extends TemplateExerciseInput {
	exerciseName: string;
	muscleGroup: MuscleGroup | null;
}
