export const WORKOUT_EXERCISE_DEFAULTS = {
	targetSets: 3,
	repRangeLower: 8,
	repRangeUpper: 12,
	restDurationSeconds: 90
} as const;

export const TEMPLATE_EXERCISE_DEFAULTS = {
	targetSets: 3,
	repRangeLower: 6,
	repRangeUpper: 10,
	restDurationSeconds: 180
} as const;

export const PROGRESSION_STAGNATION_THRESHOLD = 3;
