import { describe, it, expect } from 'vitest';
import { boxForFesta, claimedBoxKey, festaYear } from '$utils/spawn/claimed-box';
import { SpawnBox } from '$types/character-spawn.type';

// The browser's copy of what `claim_booster` works out for itself: which of a town's two
// boxes is on offer, and which (town, year, stock) that box is remembered by. The two
// sides have to agree exactly — a box drawn as openable and then refused is the one thing
// this is here to prevent.

describe('boxForFesta', () => {
	it('is the white box on the day of the festa and the black one around it', () => {
		expect(boxForFesta('2026-08-15', '2026-08-15')).toBe(SpawnBox.White);
		expect(boxForFesta('2026-08-12', '2026-08-15')).toBe(SpawnBox.Black);
		expect(boxForFesta('2026-08-19', '2026-08-15')).toBe(SpawnBox.Black);
	});
});

describe('festaYear', () => {
	it('is the festa’s own year, not the reader’s day', () => {
		// The window reaches four days past the last festa of a year, so this one is the
		// new year's box to somebody opening it on the 30th of December.
		expect(festaYear('2027-01-02')).toBe(2027);
		expect(festaYear('2026-12-31')).toBe(2026);
	});

	it('reads the year off the string rather than through a Date', () => {
		// `new Date('2026-01-01').getFullYear()` resolves the bare date in UTC and hands
		// back 2025 to anybody west of Greenwich. This never does.
		expect(festaYear('2026-01-01')).toBe(2026);
	});
});

describe('claimedBoxKey', () => {
	it('tells a town’s two boxes apart, and one year from the next', () => {
		const white = claimedBoxKey('ES_08028', 2026, SpawnBox.White);
		const black = claimedBoxKey('ES_08028', 2026, SpawnBox.Black);
		const nextYear = claimedBoxKey('ES_08028', 2027, SpawnBox.White);
		expect(new Set([white, black, nextYear]).size).toBe(3);
	});

	it('takes the stock as the plain string a claim row carries', () => {
		// `booster_claims.box` comes back as text, not as the enum.
		expect(claimedBoxKey('ES_25001', 2026, 'white')).toBe(
			claimedBoxKey('ES_25001', 2026, SpawnBox.White)
		);
	});
});
