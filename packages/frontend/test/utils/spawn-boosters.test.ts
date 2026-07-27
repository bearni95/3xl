import { describe, it, expect } from 'vitest';
import { groupSpawnsIntoBoosters } from '$utils/spawn/boosters';
import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';

// Minimal spawn factory — only the fields the grouping keys on matter here.
function spawn(overrides: Partial<CharacterSpawn> & { id: string }): CharacterSpawn {
	return {
		userId: 'u1',
		characterId: 'goku',
		showId: 1,
		locationId: 'ES_08028',
		color: SpawnColor.Red,
		stat: 5,
		createdAt: '2026-07-27T10:00:00.000Z',
		...overrides
	};
}

describe('groupSpawnsIntoBoosters', () => {
	it('groups spawns sharing a created_at, show and location into one pack', () => {
		const spawns = [
			spawn({ id: 'a' }),
			spawn({ id: 'b' }),
			spawn({ id: 'c' }),
			spawn({ id: 'd' }),
			spawn({ id: 'e' })
		];
		const boosters = groupSpawnsIntoBoosters(spawns);
		expect(boosters).toHaveLength(1);
		expect(boosters[0].spawns.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(boosters[0].openedAt).toBe('2026-07-27T10:00:00.000Z');
		expect(boosters[0].showId).toBe(1);
		expect(boosters[0].locationId).toBe('ES_08028');
	});

	it('splits packs opened at different instants', () => {
		const boosters = groupSpawnsIntoBoosters([
			spawn({ id: 'a', createdAt: '2026-07-27T10:00:00.000Z' }),
			spawn({ id: 'b', createdAt: '2026-07-27T10:00:00.000Z' }),
			spawn({ id: 'c', createdAt: '2026-07-27T11:30:00.000Z' })
		]);
		expect(boosters).toHaveLength(2);
		expect(boosters[0].spawns.map((s) => s.id)).toEqual(['a', 'b']);
		expect(boosters[1].spawns.map((s) => s.id)).toEqual(['c']);
	});

	it('keeps same-instant packs apart when opened in different places or shows', () => {
		const at = '2026-07-27T10:00:00.000Z';
		const boosters = groupSpawnsIntoBoosters([
			spawn({ id: 'a', createdAt: at, locationId: 'ES_08028' }),
			spawn({ id: 'b', createdAt: at, locationId: 'ES_46250' }),
			spawn({ id: 'c', createdAt: at, locationId: 'ES_08028', showId: 2 })
		]);
		expect(boosters).toHaveLength(3);
	});

	it('preserves input order, so a newest-first list yields newest-first packs', () => {
		const boosters = groupSpawnsIntoBoosters([
			spawn({ id: 'newer', createdAt: '2026-07-27T12:00:00.000Z' }),
			spawn({ id: 'older', createdAt: '2026-07-27T09:00:00.000Z' })
		]);
		expect(boosters.map((b) => b.openedAt)).toEqual([
			'2026-07-27T12:00:00.000Z',
			'2026-07-27T09:00:00.000Z'
		]);
	});

	it('returns no packs for an empty roster', () => {
		expect(groupSpawnsIntoBoosters([])).toEqual([]);
	});
});
