import { describe, it, expect, vi, beforeEach } from 'vitest';
import { catalanDayIso } from '$utils/festes/catalan-day';
import type {
	AchievementAwardRow,
	AchievementClaimRow,
	AchievementsCollection
} from '$types/achievement.type';

/**
 * The badge list is stitched from two places: Supabase says which ids exist and
 * which of them the game holds a rule for, and the authored file says what each one
 * is. What matters is that the seam holds — the order is the database's, the wording
 * is the file's, an id the file has nothing for is not drawn at all rather than drawn
 * blank, and the pool drawn from is the database's list rather than the file's, since
 * that is the pool the RPC draws the day's badges from.
 */

// What the tables and the RPC hand back, set per test.
let templateRows: { id: string; requirement: string | null }[] = [];
let templatesError: unknown = null;
let awardRows: AchievementAwardRow[] = [];
let awardQuery: string[] = [];
let settingsRow: { daily_count: number } | null = null;
// The `towns` a formula reads: a count, asked for as a count.
let townCount: number | null = 0;
let townQuery: string[] = [];
// The pinned level of each day this player has looked, and what the RPC pins today at.
let dayLevelRows: { day: string; level: number }[] = [];
let pinnedLevel: number | null = null;
let claimRows: AchievementClaimRow[] | null = [];
let rpcError: unknown = null;
let rpcCalls: string[] = [];

vi.mock('$services/supabase.client', () => ({
	getSupabaseClient: () => ({
		from: (table: string) => ({
			select: (columns: string, options?: { count?: string; head?: boolean }) => {
				if (table === 'achievement_templates') {
					return Promise.resolve({ data: templateRows, error: templatesError });
				}
				if (table === 'achievement_settings') {
					return { maybeSingle: () => Promise.resolve({ data: settingsRow, error: null }) };
				}
				if (table === 'achievement_day_levels') {
					return Promise.resolve({ data: dayLevelRows, error: null });
				}
				if (table === 'municipality_holders') {
					// Counted, and with no rows sent back: `head` is what makes this a number
					// rather than every town the player holds.
					townQuery.push(`${columns} count=${options?.count} head=${options?.head}`);
					return {
						eq: (column: string, value: string) => {
							townQuery.push(`${column}=${value}`);
							return Promise.resolve({ count: townCount, error: null });
						}
					};
				}
				awardQuery.push(columns);
				// The chain the service builds: filtered to one player, newest first.
				return {
					eq: (column: string, value: string) => {
						awardQuery.push(`${column}=${value}`);
						return {
							order: (column2: string, options: { ascending: boolean }) => {
								awardQuery.push(`${column2} ${options.ascending ? 'asc' : 'desc'}`);
								return Promise.resolve({ data: awardRows, error: null });
							}
						};
					}
				};
			}
		}),
		rpc: (name: string) => {
			rpcCalls.push(name);
			if (name === 'daily_achievement_level') {
				return Promise.resolve({ data: pinnedLevel, error: null });
			}
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
	awardQuery = [];
	settingsRow = null;
	townCount = 0;
	townQuery = [];
	dayLevelRows = [];
	pinnedLevel = null;
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

	it('drops an id the file has nothing for, but keeps it in the pool', async () => {
		// The RPC would still draw a row whose badge was retired locally, so leaving it
		// out of the pool would have the two sides pick different sets.
		templateRows = [
			{ id: 'conqueridor', requirement: 'cards >= 1' },
			{ id: 'retired-badge', requirement: 'cards >= 5' }
		];
		const snapshot = await load();
		expect(snapshot.achievements.map((a) => a.id)).toEqual(['conqueridor']);
		expect(snapshot.pool).toEqual(['conqueridor', 'retired-badge']);
	});

	it('keeps a badge with no rule in the pool — it is set, it just cannot be earned', async () => {
		templateRows = [
			{ id: 'conqueridor', requirement: null },
			{ id: 'first-blood', requirement: 'cards >= target' }
		];
		const snapshot = await load();
		expect(snapshot.achievements).toHaveLength(2);
		expect(snapshot.pool).toEqual(['conqueridor', 'first-blood']);
	});

	it('reports what the player has completed, and what each of them paid', async () => {
		templateRows = [
			{ id: 'conqueridor', requirement: 'cards >= 1' },
			{ id: 'first-blood', requirement: 'cards >= target' }
		];
		awardRows = [
			{ achievement_id: 'first-blood', awarded_at: '2026-07-30T09:00:00Z', exp_awarded: '200' },
			{ achievement_id: 'conqueridor', awarded_at: '2026-07-28T11:30:00Z', exp_awarded: '100' }
		];
		const snapshot = await load();
		expect(snapshot.awards).toEqual([
			{ achievementId: 'first-blood', awardedAt: '2026-07-30T09:00:00Z', expAwarded: 200 },
			{ achievementId: 'conqueridor', awardedAt: '2026-07-28T11:30:00Z', expAwarded: 100 }
		]);
		// The same ledger as a set, which is all a tile asks for.
		expect([...snapshot.held]).toEqual(['first-blood', 'conqueridor']);
		// Asked for as one player's, newest first — the table is world-readable, so the
		// filter is what makes it theirs rather than everybody's.
		expect(awardQuery).toEqual([
			'achievement_id, awarded_at, exp_awarded',
			'user_id=user-1',
			'awarded_at desc'
		]);
	});

	it('asks for nobody’s awards when there is no player', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		awardRows = [
			{ achievement_id: 'conqueridor', awarded_at: '2026-07-28T11:30:00Z', exp_awarded: '100' }
		];
		const snapshot = await load(null);
		expect(snapshot.awards).toEqual([]);
		expect([...snapshot.held]).toEqual([]);
		expect(awardQuery).toEqual([]);
	});

	it('reads a badge earned at the level cap as having paid nothing', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		awardRows = [
			{ achievement_id: 'conqueridor', awarded_at: '2026-07-28T11:30:00Z', exp_awarded: null }
		];
		expect((await load()).awards[0].expAwarded).toBe(0);
	});

	it('counts the towns the player holds, as a count and as their own', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		townCount = 7;
		expect((await load()).towns).toBe(7);
		expect(townQuery).toEqual(['location_id count=exact head=true', 'user_id=user-1']);
	});

	it('reads no towns for a visitor, and asks nobody', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		townCount = 7;
		expect((await load(null)).towns).toBe(0);
		expect(townQuery).toEqual([]);
	});

	it('reads a count Supabase did not send as no towns at all', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		townCount = null;
		expect((await load()).towns).toBe(0);
	});

	it('reads the level each day’s badges are set against, today’s pinned by the read', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		dayLevelRows = [{ day: '2026-07-28', level: 2 }];
		pinnedLevel = 5;
		const snapshot = await load();
		// A past day keeps the level it was set at, whatever the player is now.
		expect(snapshot.dayLevels.get('2026-07-28')).toBe(2);
		expect(snapshot.dayLevels.get(catalanDayIso())).toBe(5);
		expect(rpcCalls).toEqual(['daily_achievement_level']);
	});

	it('takes the RPC’s word for today over the row read beside it', async () => {
		// The two were asked in the same breath, and it is the RPC that pins the day: a
		// row written a moment after the select is not a day with no level.
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		dayLevelRows = [{ day: catalanDayIso(), level: 3 }];
		pinnedLevel = 5;
		expect((await load()).dayLevels.get(catalanDayIso())).toBe(5);
	});

	it('pins nothing for a visitor', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'towns >= 3' }];
		pinnedLevel = 5;
		const snapshot = await load(null);
		expect([...snapshot.dayLevels]).toEqual([]);
		expect(rpcCalls).toEqual([]);
	});

	it('reads how many badges a day from Supabase, not from the code', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		settingsRow = { daily_count: 5 };
		expect((await load()).dailyCount).toBe(5);
	});

	it('falls back to the shipped count when there is no settings row', async () => {
		templateRows = [{ id: 'conqueridor', requirement: 'cards >= 1' }];
		settingsRow = null;
		expect((await load()).dailyCount).toBe(3);
	});

	it('is empty when nothing has been synced', async () => {
		templateRows = [];
		const snapshot = await load();
		expect(snapshot.achievements).toEqual([]);
		expect(snapshot.pool).toEqual([]);
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
