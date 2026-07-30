import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AchievementClaimRow, AchievementsCollection } from '$types/achievement.type';

/**
 * The badge list is stitched from two places: Supabase says which ids exist and
 * which of them the game holds a rule for, and the authored file says what each one
 * is. What matters is that the seam holds — the order is the database's, the wording
 * is the file's, an id the file has nothing for is not drawn at all rather than drawn
 * blank, and the claimable pool is the database's list rather than the file's, since
 * that is the pool the RPC will draw today's three from.
 */

// What the tables and the RPC hand back, set per test.
let templateRows: { id: string; requirement: string | null }[] = [];
let templatesError: unknown = null;
let awardRows: { achievement_id: string }[] = [];
let claimRows: AchievementClaimRow[] | null = [];
let rpcError: unknown = null;
let rpcCalls: string[] = [];

vi.mock('$services/supabase.client', () => ({
	getSupabaseClient: () => ({
		from: (table: string) => ({
			select: () =>
				table === 'achievement_templates'
					? Promise.resolve({ data: templateRows, error: templatesError })
					: { eq: () => Promise.resolve({ data: awardRows, error: null }) }
		}),
		rpc: (name: string) => {
			rpcCalls.push(name);
			return Promise.resolve({ data: claimRows, error: rpcError });
		}
	})
}));

const authored: AchievementsCollection = {
	achievements: [
		{
			id: 'conqueridor',
			name: 'Conqueridor',
			description: 'Conquereix.',
			icon: 'lorc/castle',
			requirement: 'cards >= 1'
		},
		{
			id: 'first-blood',
			name: 'First blood {target}',
			description: 'Win {target}.',
			icon: 'lorc/broadsword',
			variables: [{ name: 'target', formula: 'level' }],
			requirement: 'cards >= target'
		}
	]
};

let fetched: ReturnType<typeof vi.fn>;

beforeEach(() => {
	// The service caches the file for the session, so each case starts on a fresh
	// module or the second one would assert against the first one's fetch.
	vi.resetModules();
	templateRows = [];
	templatesError = null;
	awardRows = [];
	claimRows = [];
	rpcError = null;
	rpcCalls = [];
	fetched = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(authored) }));
	vi.stubGlobal('fetch', fetched);
});

async function load(userId: string | null = 'user-1') {
	const { loadAchievements } = await import('$services/achievements.service');
	return loadAchievements(userId);
}

describe('loading the game’s achievements', () => {
	it('resolves each row against the authored file, in the order the rows came', async () => {
		templateRows = [
			{ id: 'first-blood', requirement: 'cards >= target' },
			{ id: 'conqueridor', requirement: 'cards >= 1' }
		];
		const snapshot = await load();
		expect(snapshot.achievements.map((achievement) => achievement.id)).toEqual([
			'first-blood',
			'conqueridor'
		]);
		// The wording — variables and all — is the file's, untouched.
		expect(snapshot.achievements[0].name).toBe('First blood {target}');
		expect(snapshot.achievements[0].variables).toEqual([{ name: 'target', formula: 'level' }]);
	});

	it('drops an id the file has nothing for, but keeps it in the claimable pool', async () => {
		// The RPC would still draw a synced rule whose badge was retired locally, so
		// leaving it out of the pool would have the two sides pick different threes.
		templateRows = [
			{ id: 'conqueridor', requirement: 'cards >= 1' },
			{ id: 'retired-badge', requirement: 'cards >= 5' }
		];
		const snapshot = await load();
		expect(snapshot.achievements.map((a) => a.id)).toEqual(['conqueridor']);
		expect(snapshot.claimable).toEqual(['conqueridor', 'retired-badge']);
	});

	it('leaves a badge with no rule out of the claimable pool', async () => {
		templateRows = [
			{ id: 'conqueridor', requirement: null },
			{ id: 'first-blood', requirement: 'cards >= target' }
		];
		const snapshot = await load();
		expect(snapshot.achievements).toHaveLength(2);
		expect(snapshot.claimable).toEqual(['first-blood']);
	});

	it('reports what the player already holds', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		awardRows = [{ achievement_id: 'conqueridor' }];
		expect([...(await load()).held]).toEqual(['conqueridor']);
	});

	it('asks for nobody’s awards when there is no player', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		awardRows = [{ achievement_id: 'conqueridor' }];
		expect([...(await load(null)).held]).toEqual([]);
	});

	it('is empty when nothing has been synced', async () => {
		templateRows = [];
		const snapshot = await load();
		expect(snapshot.achievements).toEqual([]);
		expect(snapshot.claimable).toEqual([]);
	});

	it('fetches the file once however often the list is asked for', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		const { loadAchievements } = await import('$services/achievements.service');
		await loadAchievements('user-1');
		await loadAchievements('user-1');
		expect(fetched).toHaveBeenCalledTimes(1);
	});

	it('raises what the table said when the read fails', async () => {
		templatesError = { message: 'permission denied for table achievement_templates' };
		await expect(load()).rejects.toEqual(templatesError);
	});
});

describe('claiming today’s badges', () => {
	it('submits nothing but the intention, and reads the server’s answer back', async () => {
		claimRows = [
			{
				achievement_id: 'conqueridor',
				granted: true,
				held: false,
				met: true,
				exp_awarded: '200',
				at_level: 2,
				total_exp: '506'
			},
			{
				achievement_id: 'first-blood',
				granted: false,
				held: false,
				met: false,
				exp_awarded: '0',
				at_level: 2,
				total_exp: '506'
			}
		];
		const { claimAchievements } = await import('$services/achievements.service');
		const rows = await claimAchievements();
		// The RPC takes no arguments: what is claimable, what was earned and what it
		// pays are all its own to decide.
		expect(rpcCalls).toEqual(['claim_achievements']);
		expect(rows).toEqual([
			{
				achievementId: 'conqueridor',
				granted: true,
				held: false,
				met: true,
				expAwarded: 200,
				atLevel: 2,
				totalExp: 506
			},
			{
				achievementId: 'first-blood',
				granted: false,
				held: false,
				met: false,
				expAwarded: 0,
				atLevel: 2,
				totalExp: 506
			}
		]);
	});

	it('reads no rows as nothing claimed', async () => {
		claimRows = null;
		const { claimAchievements } = await import('$services/achievements.service');
		expect(await claimAchievements()).toEqual([]);
	});

	it('raises what the RPC refused with', async () => {
		rpcError = { message: 'You must be signed in to claim an achievement.' };
		const { claimAchievements } = await import('$services/achievements.service');
		await expect(claimAchievements()).rejects.toEqual(rpcError);
	});
});
