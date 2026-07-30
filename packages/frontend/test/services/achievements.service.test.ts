import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AchievementsCollection } from '$types/achievement.type';

/**
 * The badge list is stitched from two places: Supabase says which ids exist and the
 * authored file says what each of them is. What matters is that the seam holds — the
 * order is the database's, the wording is the file's, and an id the file has nothing
 * for is not drawn at all rather than drawn blank.
 */

// The rows the table hands back, set per test.
let rows: { id: string }[] = [];
let rowsError: unknown = null;

vi.mock('$services/supabase.client', () => ({
	getSupabaseClient: () => ({
		from: () => ({ select: () => Promise.resolve({ data: rows, error: rowsError }) })
	})
}));

const authored: AchievementsCollection = {
	achievements: [
		{ id: 'conqueridor', name: 'Conqueridor', description: 'Conquereix.', icon: 'lorc/castle' },
		{
			id: 'first-blood',
			name: 'First blood {target}',
			description: 'Win {target}.',
			icon: 'lorc/broadsword',
			variables: [{ name: 'target', formula: 'level' }]
		}
	]
};

let fetched: ReturnType<typeof vi.fn>;

beforeEach(() => {
	// The service caches the file for the session, so each case starts on a fresh
	// module or the second one would assert against the first one's fetch.
	vi.resetModules();
	rows = [];
	rowsError = null;
	fetched = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(authored) }));
	vi.stubGlobal('fetch', fetched);
});

async function load() {
	const { loadAchievements } = await import('$services/achievements.service');
	return loadAchievements();
}

describe('loading the game’s achievements', () => {
	it('resolves each row against the authored file, in the order the rows came', async () => {
		rows = [{ id: 'first-blood' }, { id: 'conqueridor' }];
		const achievements = await load();
		expect(achievements.map((achievement) => achievement.id)).toEqual([
			'first-blood',
			'conqueridor'
		]);
		// The wording — variables and all — is the file's, untouched.
		expect(achievements[0].name).toBe('First blood {target}');
		expect(achievements[0].variables).toEqual([{ name: 'target', formula: 'level' }]);
	});

	it('drops an id the file has nothing for', async () => {
		rows = [{ id: 'conqueridor' }, { id: 'retired-badge' }];
		expect((await load()).map((achievement) => achievement.id)).toEqual(['conqueridor']);
	});

	it('is empty when nothing has been synced', async () => {
		rows = [];
		expect(await load()).toEqual([]);
	});

	it('fetches the file once however often the list is asked for', async () => {
		rows = [{ id: 'conqueridor' }];
		const { loadAchievements } = await import('$services/achievements.service');
		await loadAchievements();
		await loadAchievements();
		expect(fetched).toHaveBeenCalledTimes(1);
	});

	it('raises what the table said when the read fails', async () => {
		rowsError = { message: 'permission denied for table achievement_templates' };
		await expect(load()).rejects.toEqual(rowsError);
	});
});
