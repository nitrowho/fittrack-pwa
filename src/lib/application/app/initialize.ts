import { seedDatabase } from '$lib/db/seed.js';

export async function initializeApp(): Promise<void> {
	await seedDatabase();
}
