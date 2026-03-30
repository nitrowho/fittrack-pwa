import { db } from './database.js';

interface BackupData {
	backupVersion: number;
	exportedAt: string;
	data: {
		exercises: unknown[];
		workoutTemplates: unknown[];
		templateExercises: unknown[];
		workoutSessions: unknown[];
		exerciseSessions: unknown[];
		exerciseSets: unknown[];
		settings?: unknown[];
	};
}

export async function createBackup(): Promise<Blob> {
	const [exercises, workoutTemplates, templateExercises, workoutSessions, exerciseSessions, exerciseSets, settings] =
		await Promise.all([
			db.exercises.toArray(),
			db.workoutTemplates.toArray(),
			db.templateExercises.toArray(),
			db.workoutSessions.toArray(),
			db.exerciseSessions.toArray(),
			db.exerciseSets.toArray(),
			db.settings.toArray()
		]);

	const backup: BackupData = {
		backupVersion: 1,
		exportedAt: new Date().toISOString(),
		data: {
			exercises,
			workoutTemplates,
			templateExercises,
			workoutSessions,
			exerciseSessions,
			exerciseSets,
			settings
		}
	};

	return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

export async function restoreBackup(file: File): Promise<void> {
	const text = await file.text();
	const backup: BackupData = JSON.parse(text);

	if (backup.backupVersion !== 1) {
		throw new Error(`Unsupported backup version: ${backup.backupVersion}`);
	}

	// Parse date strings back to Date objects
	const sessions = (backup.data.workoutSessions as Record<string, unknown>[]).map((s) => ({
		...s,
		startedAt: new Date(s.startedAt as string),
		completedAt: s.completedAt ? new Date(s.completedAt as string) : null,
		createdAt: s.createdAt ? new Date(s.createdAt as string) : undefined
	}));

	const exerciseSessions = (backup.data.exerciseSessions as Record<string, unknown>[]).map((s) => ({
		...s,
		startedAt: s.startedAt ? new Date(s.startedAt as string) : null,
		completedAt: s.completedAt ? new Date(s.completedAt as string) : null
	}));

	const exerciseSets = (backup.data.exerciseSets as Record<string, unknown>[]).map((s) => ({
		...s,
		completedAt: s.completedAt ? new Date(s.completedAt as string) : null
	}));

	const templates = (backup.data.workoutTemplates as Record<string, unknown>[]).map((t) => ({
		...t,
		createdAt: new Date(t.createdAt as string)
	}));

	await db.transaction(
		'rw',
		[
			db.exercises,
			db.workoutTemplates,
			db.templateExercises,
			db.workoutSessions,
			db.exerciseSessions,
			db.exerciseSets,
			db.settings
		],
		async () => {
			await db.exercises.clear();
			await db.workoutTemplates.clear();
			await db.templateExercises.clear();
			await db.workoutSessions.clear();
			await db.exerciseSessions.clear();
			await db.exerciseSets.clear();
			await db.settings.clear();

			await db.exercises.bulkAdd(backup.data.exercises as never[]);
			await db.workoutTemplates.bulkAdd(templates as never[]);
			await db.templateExercises.bulkAdd(backup.data.templateExercises as never[]);
			await db.workoutSessions.bulkAdd(sessions as never[]);
			await db.exerciseSessions.bulkAdd(exerciseSessions as never[]);
			await db.exerciseSets.bulkAdd(exerciseSets as never[]);

			if (backup.data.settings?.length) {
				await db.settings.bulkAdd(backup.data.settings as never[]);
			}
		}
	);
}

export async function downloadBackup(): Promise<void> {
	const blob = await createBackup();
	const date = new Date().toISOString().split('T')[0];
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `fittrack-backup-${date}.json`;
	a.click();
	URL.revokeObjectURL(url);
}
