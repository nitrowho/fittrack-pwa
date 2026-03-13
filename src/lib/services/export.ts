import { db } from '$lib/db/database.js';
import { formatDate } from './formatter.js';
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '$lib/models/types.js';

export async function exportCSV(): Promise<Blob> {
	const sessions = await db.workoutSessions
		.where('completedAt')
		.notEqual(null as never)
		.toArray();
	sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

	const lines: string[] = [
		'# FitTrack Export v1',
		'Datum;Vorlage;\u00dcbung;Muskelgruppe;Satz;Gewicht (kg);Wiederholungen;RIR'
	];

	for (const session of sessions) {
		const exerciseSessions = await db.exerciseSessions
			.where('workoutSessionId')
			.equals(session.id)
			.sortBy('sortOrder');

		for (const es of exerciseSessions) {
			const sets = await db.exerciseSets
				.where('exerciseSessionId')
				.equals(es.id)
				.sortBy('setNumber');

			for (const set of sets) {
				if (!set.isCompleted) continue;
				const muscleLabel = es.muscleGroup
					? MUSCLE_GROUP_LABELS[es.muscleGroup as MuscleGroup]
					: '';
				const weight = set.weight.toString().replace('.', ',');
				const rir = set.rir !== null ? set.rir.toString() : '';

				lines.push(
					`${formatDate(session.startedAt)};${session.templateName};${es.exerciseName};${muscleLabel};${set.setNumber};${weight};${set.reps};${rir}`
				);
			}
		}
	}

	return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}

export async function exportJSON(): Promise<Blob> {
	const sessions = await db.workoutSessions
		.where('completedAt')
		.notEqual(null as never)
		.toArray();

	const data = [];
	for (const session of sessions) {
		const exerciseSessions = await db.exerciseSessions
			.where('workoutSessionId')
			.equals(session.id)
			.sortBy('sortOrder');

		const exercises = [];
		for (const es of exerciseSessions) {
			const sets = await db.exerciseSets
				.where('exerciseSessionId')
				.equals(es.id)
				.sortBy('setNumber');

			exercises.push({
				...es,
				sets: sets.filter((s) => s.isCompleted)
			});
		}

		data.push({ ...session, exercises });
	}

	const exportData = {
		exportVersion: 1,
		exportedAt: new Date().toISOString(),
		sessions: data
	};

	return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}

export function downloadFile(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
