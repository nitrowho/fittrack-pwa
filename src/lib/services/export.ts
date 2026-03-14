import { formatDate } from './formatter.js';
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '$lib/models/types.js';

export interface ExportExerciseSet {
	setNumber: number;
	weight: number;
	reps: number;
	rir: number | null;
	isCompleted: boolean;
}

export interface ExportExerciseSession {
	exerciseName: string;
	muscleGroup: MuscleGroup | null;
	sortOrder: number;
	sets: ExportExerciseSet[];
}

export interface ExportWorkoutSession {
	startedAt: Date;
	templateName: string;
	exercises: ExportExerciseSession[];
}

export function createCsvExport(sessions: ExportWorkoutSession[]): Blob {
	const lines: string[] = [
		'# FitTrack Export v1',
		'Datum;Vorlage;\u00dcbung;Muskelgruppe;Satz;Gewicht (kg);Wiederholungen;RIR'
	];

	for (const session of sessions) {
		for (const exerciseSession of session.exercises) {
			for (const set of exerciseSession.sets) {
				const muscleLabel = exerciseSession.muscleGroup
					? MUSCLE_GROUP_LABELS[exerciseSession.muscleGroup as MuscleGroup]
					: '';
				const weight = set.weight.toString().replace('.', ',');
				const rir = set.rir !== null ? set.rir.toString() : '';

				lines.push(
					`${formatDate(session.startedAt)};${session.templateName};${exerciseSession.exerciseName};${muscleLabel};${set.setNumber};${weight};${set.reps};${rir}`
				);
			}
		}
	}

	return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}

export function createJsonExport(sessions: ExportWorkoutSession[]): Blob {
	const exportData = {
		exportVersion: 1,
		exportedAt: new Date().toISOString(),
		sessions
	};

	return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}
