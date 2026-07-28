import { describe, it, expect } from 'vitest';
import { buildMunicipalityTeam } from '$utils/spawn/municipality-team';
import { teammateColors } from '$utils/color/compare';
import { SpawnColor } from '$types/character-spawn.type';
import type { CombatColor } from '$types/character-definition.type';

const POOL = ['luffy', 'zoro', 'nami', 'sanji', 'chopper'];

describe('buildMunicipalityTeam', () => {
	it('is deterministic: the same seed + pool yields the same team', () => {
		const a = buildMunicipalityTeam(123456, POOL, 3);
		const b = buildMunicipalityTeam(123456, POOL, 3);
		expect(a).toEqual(b);
	});

	it('rolls up to `size` distinct characters, all drawn from the pool', () => {
		const team = buildMunicipalityTeam(987654, POOL, 3);
		expect(team).toHaveLength(3);
		const ids = team.map((member) => member.characterId);
		expect(new Set(ids).size).toBe(3); // distinct
		for (const id of ids) expect(POOL).toContain(id);
	});

	it('caps the team at the pool size when the pool is smaller than `size`', () => {
		const team = buildMunicipalityTeam(42, ['luffy'], 3);
		expect(team).toHaveLength(1);
		expect(team[0].characterId).toBe('luffy');
	});

	it('returns an empty team for an empty pool', () => {
		expect(buildMunicipalityTeam(42, [], 3)).toEqual([]);
	});

	it('keeps every teammate colour within the lead colour family (the roster rule)', () => {
		// Sweep many seeds so every lead colour is exercised.
		for (let seed = 0; seed < 500; seed++) {
			const team = buildMunicipalityTeam(seed, POOL, 3);
			if (team.length < 2) continue;
			const allowed = new Set<string>(teammateColors(team[0].color as unknown as CombatColor));
			for (const member of team.slice(1)) {
				expect(allowed.has(member.color)).toBe(true);
			}
		}
	});

	it('rolls a valid colour for every member', () => {
		const colors = new Set<string>(Object.values(SpawnColor));
		for (let seed = 0; seed < 100; seed++) {
			for (const member of buildMunicipalityTeam(seed, POOL, 3)) {
				expect(colors.has(member.color)).toBe(true);
			}
		}
	});
});
