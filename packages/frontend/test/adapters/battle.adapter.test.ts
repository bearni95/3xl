import { describe, expect, it } from 'vitest';
import { battleAdapter } from '$adapters/classes/battle.adapter';
import type { OpenBattleRow } from '$types/battle.type';
import { SpawnColor } from '$types/character-spawn.type';

const fighter = (over: Record<string, unknown> = {}) => ({
	side: 'info',
	slot: 0,
	spawnId: 'spawn-1',
	charges: 1,
	down: false,
	spent: ['defend'],
	action: 'charge',
	cell: { q: 2, r: -2 },
	...over
});

const row = (over: Partial<OpenBattleRow> = {}): OpenBattleRow => ({
	location_id: 'ES_08028',
	turnover: 2,
	rivals: [{ character_id: 'goku', color: 'blue' }],
	team: ['spawn-1', 'spawn-2', 'spawn-3'],
	board: { turn: 5, fighters: [fighter()] },
	started_at: '2026-07-29T10:00:00Z',
	...over
});

describe('battleAdapter', () => {
	it('reads a battle row', () => {
		const battle = battleAdapter.fromRow(row());
		expect(battle.locationId).toBe('ES_08028');
		expect(battle.turnover).toBe(2);
		expect(battle.rivals).toEqual([{ characterId: 'goku', color: SpawnColor.Blue }]);
		// The line-up the battle was opened with, as start_battle proved and stored it.
		expect(battle.team).toEqual(['spawn-1', 'spawn-2', 'spawn-3']);
		expect(battle.board?.turn).toBe(5);
		expect(battle.board?.fighters[0]).toEqual({
			side: 'info',
			slot: 0,
			spawnId: 'spawn-1',
			charges: 1,
			down: false,
			spent: ['defend'],
			action: 'charge',
			cell: { q: 2, r: -2 }
		});
	});

	it('keeps only the orders it recognises among the gifts already spent', () => {
		const board = { turn: 2, fighters: [fighter({ spent: ['defend', 'sulk', 7] })] };
		expect(battleAdapter.fromRow(row({ board })).board?.fighters[0].spent).toEqual(['defend']);
	});

	it("reads an older board's spent guard as the free defend it became", () => {
		// Boards written before a colour's gift was one of the three orders stored blue's
		// guard on its own. A battle left open across the change must not come back with
		// the guard it had already used still in hand.
		const legacy = { turn: 2, fighters: [fighter({ spent: undefined, guardSpent: true })] };
		expect(battleAdapter.fromRow(row({ board: legacy })).board?.fighters[0].spent).toEqual([
			'defend'
		]);
	});

	it('sends the rival line-up back in the shape Postgres holds it', () => {
		expect(battleAdapter.rivalsToJson([{ characterId: 'goku', color: SpawnColor.Green }])).toEqual([
			{ character_id: 'goku', color: 'green' }
		]);
	});

	it('falls back to red for a rival whose colour it cannot read, and drops the nameless', () => {
		const battle = battleAdapter.fromRow(
			row({ rivals: [{ character_id: 'goku', color: 'octarine' }, { color: 'blue' }, null] })
		);
		expect(battle.rivals).toEqual([{ characterId: 'goku', color: SpawnColor.Red }]);
	});

	it('reads no board at all rather than a half-restored one', () => {
		// A fight is resumed from this or not at all, so anything unreadable has to come
		// back as null — the arena then starts the encounter instead of playing a
		// board missing a lane, a spawn or a turn.
		for (const board of [
			null,
			'nonsense',
			{ turn: 0, fighters: [fighter()] },
			{ turn: 3, fighters: [] },
			{ turn: 3, fighters: [fighter(), { charges: 1 }] },
			{ turn: 3, fighters: [fighter({ side: 'nobody' })] },
			{ turn: 3, fighters: [fighter({ spawnId: '' })] },
			{ turn: 3, fighters: [fighter({ slot: -1 })] }
		]) {
			expect(battleAdapter.fromRow(row({ board })).board).toBeNull();
		}
	});

	it('takes an unreadable order as no order, rather than refusing the board', () => {
		const battle = battleAdapter.fromRow(row({ board: { turn: 3, fighters: [fighter({ action: 'flee' })] } }));
		expect(battle.board?.fighters[0].action).toBeNull();
	});

	it('reads a battle opened but never played', () => {
		const battle = battleAdapter.fromRow(row({ board: null, turnover: null }));
		expect(battle.board).toBeNull();
		expect(battle.turnover).toBe(0);
		expect(battle.rivals).toHaveLength(1);
	});

	it('reads no team at all off a battle opened before one was recorded', () => {
		// Nothing is invented for it: the arena falls back to the board, and then to the
		// roster, exactly as it did before the line-up was stored.
		for (const team of [null, undefined, 'spawn-1', [1, '', null]]) {
			expect(battleAdapter.fromRow(row({ team })).team).toEqual([]);
		}
	});
});
