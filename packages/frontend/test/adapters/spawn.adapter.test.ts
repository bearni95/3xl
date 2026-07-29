import { describe, it, expect } from 'vitest';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import { SpawnBox, SpawnColor, type CharacterSpawnRow } from '$types/character-spawn.type';

function row(overrides: Partial<CharacterSpawnRow> = {}): CharacterSpawnRow {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		user_id: 'player-1',
		character_id: 'goku',
		show_id: '813',
		location_id: 'ES_08028',
		color: 'blue',
		box: 'black',
		created_at: '2026-07-28T00:00:00.000Z',
		...overrides
	};
}

describe('spawnAdapter.fromRow', () => {
	it('normalises the bigint show id and keeps the rolled colour', () => {
		const spawn = spawnAdapter.fromRow(row());
		expect(spawn.showId).toBe(813);
		expect(spawn.color).toBe(SpawnColor.Blue);
		expect(spawn.locationId).toBe('ES_08028');
	});

	it('falls back to a stable primary for a legacy row with no colour', () => {
		expect(spawnAdapter.fromRow(row({ color: null })).color).toBe(SpawnColor.Red);
	});

	it('keeps the box the card was stamped with', () => {
		expect(spawnAdapter.fromRow(row()).box).toBe(SpawnBox.Black);
		expect(spawnAdapter.fromRow(row({ color: 'green', box: 'white' })).box).toBe(SpawnBox.White);
	});

	it('reads a legacy row without a box off its colour', () => {
		// The two triples do not overlap, so the colour names the stock on its own.
		expect(spawnAdapter.fromRow(row({ box: null })).box).toBe(SpawnBox.Black);
		expect(spawnAdapter.fromRow(row({ color: 'purple', box: undefined })).box).toBe(SpawnBox.White);
	});

	it('reads the team slot, including the lead slot 0', () => {
		expect(spawnAdapter.fromRow(row({ team_slot: 0 })).teamSlot).toBe(0);
		expect(spawnAdapter.fromRow(row({ team_slot: 2 })).teamSlot).toBe(2);
	});

	it('reads a slot serialised as a string', () => {
		expect(spawnAdapter.fromRow(row({ team_slot: '1' })).teamSlot).toBe(1);
	});

	it('is not on the team when the slot is null, absent or unreadable', () => {
		expect(spawnAdapter.fromRow(row({ team_slot: null })).teamSlot).toBeNull();
		expect(spawnAdapter.fromRow(row()).teamSlot).toBeNull();
		expect(spawnAdapter.fromRow(row({ team_slot: 'lead' })).teamSlot).toBeNull();
	});
});
