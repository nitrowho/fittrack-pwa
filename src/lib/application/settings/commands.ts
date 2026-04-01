import { createBackup, restoreBackup } from '$lib/db/backup.js';
import { downloadBlob } from '$lib/infrastructure/download.js';
import {
	listAllExerciseSessions,
	listAllExerciseSets,
	listWorkoutSessions
} from '$lib/repositories/workout-repository.js';
import {
	createCsvExport,
	createJsonExport,
	type ExportExerciseSession,
	type ExportWorkoutSession
} from '$lib/services/export.js';
import { savePlateConfig as savePlateConfigToRepo, saveThemePreference as saveThemeToRepo, type ThemePreference } from '$lib/repositories/settings-repository.js';
import type { PlateConfig } from '$lib/models/types.js';

async function getCompletedExportSessions(): Promise<ExportWorkoutSession[]> {
	const [sessions, exerciseSessions, exerciseSets] = await Promise.all([
		listWorkoutSessions(),
		listAllExerciseSessions(),
		listAllExerciseSets()
	]);

	const completedSessions = sessions
		.filter((session) => session.completedAt !== null)
		.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

	const exerciseSetsBySessionId = new Map<string, typeof exerciseSets>();
	for (const exerciseSet of exerciseSets) {
		const sets = exerciseSetsBySessionId.get(exerciseSet.exerciseSessionId) ?? [];
		sets.push(exerciseSet);
		exerciseSetsBySessionId.set(exerciseSet.exerciseSessionId, sets);
	}

	const exerciseSessionsByWorkoutSessionId = new Map<string, ExportExerciseSession[]>();
	for (const exerciseSession of exerciseSessions) {
		const sessionsForWorkout =
			exerciseSessionsByWorkoutSessionId.get(exerciseSession.workoutSessionId) ?? [];
		sessionsForWorkout.push({
			...exerciseSession,
			sets: (exerciseSetsBySessionId.get(exerciseSession.id) ?? [])
				.sort((a, b) => a.setNumber - b.setNumber)
				.filter((set) => set.isCompleted)
		});
		exerciseSessionsByWorkoutSessionId.set(exerciseSession.workoutSessionId, sessionsForWorkout);
	}

	return completedSessions.map((session) => ({
		...session,
		exercises: (exerciseSessionsByWorkoutSessionId.get(session.id) ?? []).sort(
			(a, b) => a.sortOrder - b.sortOrder
		)
	}));
}

export async function downloadBackupFile(): Promise<void> {
	const blob = await createBackup();
	const date = new Date().toISOString().split('T')[0];
	downloadBlob(blob, `fittrack-backup-${date}.json`);
}

export async function restoreBackupFile(file: File): Promise<void> {
	await restoreBackup(file);
}

export async function downloadCsvExport(): Promise<void> {
	const sessions = await getCompletedExportSessions();
	const blob = createCsvExport(sessions);
	const date = new Date().toISOString().split('T')[0];
	downloadBlob(blob, `fittrack-export-${date}.csv`);
}

export async function downloadJsonExport(): Promise<void> {
	const sessions = await getCompletedExportSessions();
	const blob = createJsonExport(sessions);
	const date = new Date().toISOString().split('T')[0];
	downloadBlob(blob, `fittrack-export-${date}.json`);
}

export async function savePlateConfig(config: PlateConfig): Promise<void> {
	await savePlateConfigToRepo(config);
}

export async function saveTheme(theme: ThemePreference): Promise<void> {
	await saveThemeToRepo(theme);
	applyTheme(theme);
}

export function applyTheme(theme: ThemePreference): void {
	localStorage.setItem('fittrack-theme', theme);
	const isDark =
		theme === 'dark' ||
		(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.toggle('dark', isDark);
}
