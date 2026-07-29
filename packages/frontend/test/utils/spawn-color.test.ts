import { describe, it, expect, afterEach, vi } from 'vitest';
import { SpawnBox, SpawnColor } from '$types/character-spawn.type';
import {
	randomSpawnColor,
	randomSpawnColorForBox,
	boxForSpawnColor,
	isSpawnColor,
	isSpawnBox,
	BOX_SPAWN_COLORS,
	SPAWN_COLOR_WEIGHTS
} from '$utils/spawn/color';

/** Stub Math.random to a fixed value so the weighted pick is deterministic. */
function stubRandom(value: number): void {
	vi.spyOn(Math, 'random').mockReturnValue(value);
}

describe('spawn colour', () => {
	afterEach(() => vi.restoreAllMocks());

	it('weights the three primaries at 3 and secondaries at 1', () => {
		const weights = Object.fromEntries(SPAWN_COLOR_WEIGHTS);
		expect(weights[SpawnColor.Red]).toBe(3);
		expect(weights[SpawnColor.Yellow]).toBe(3);
		expect(weights[SpawnColor.Blue]).toBe(3);
		expect(weights[SpawnColor.Orange]).toBe(1);
		expect(weights[SpawnColor.Green]).toBe(1);
		expect(weights[SpawnColor.Purple]).toBe(1);
	});

	it('maps roll ranges to the expected colour (total weight 12)', () => {
		// Math.random() * 12 lands in each colour's cumulative band.
		stubRandom(0 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Red);
		stubRandom(3 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Yellow);
		stubRandom(6 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Blue);
		stubRandom(9 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Orange);
		stubRandom(10 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Green);
		stubRandom(11 / 12);
		expect(randomSpawnColor()).toBe(SpawnColor.Purple);
	});

	it('makes each secondary three times as rare as each primary over many rolls', () => {
		let seed = 0;
		// Deterministic uniform-ish sequence across [0, 1).
		vi.spyOn(Math, 'random').mockImplementation(() => {
			seed = (seed + 1) % 1200;
			return seed / 1200;
		});

		const counts = new Map<SpawnColor, number>();
		for (let i = 0; i < 1200; i++) {
			const color = randomSpawnColor();
			counts.set(color, (counts.get(color) ?? 0) + 1);
		}

		// 1200 rolls over weight-12 buckets → primaries 300 each, secondaries 100 each.
		expect(counts.get(SpawnColor.Red)).toBe(300);
		expect(counts.get(SpawnColor.Orange)).toBe(100);
		expect(counts.get(SpawnColor.Red)! / counts.get(SpawnColor.Orange)!).toBe(3);
	});

	it('splits the six colours between the two boxes, neither sharing one', () => {
		expect([...BOX_SPAWN_COLORS[SpawnBox.White]].sort()).toEqual(['green', 'orange', 'purple']);
		expect([...BOX_SPAWN_COLORS[SpawnBox.Black]].sort()).toEqual(['blue', 'red', 'yellow']);
		const all = [...BOX_SPAWN_COLORS[SpawnBox.White], ...BOX_SPAWN_COLORS[SpawnBox.Black]];
		expect(new Set(all).size).toBe(Object.values(SpawnColor).length);
	});

	it('rolls only its own box\'s three, each equally likely', () => {
		for (const box of [SpawnBox.White, SpawnBox.Black]) {
			const pool = BOX_SPAWN_COLORS[box];
			pool.forEach((color, index) => {
				// Land the roll squarely inside each third of [0, 1).
				stubRandom((index + 0.5) / pool.length);
				expect(randomSpawnColorForBox(box)).toBe(color);
			});
		}
	});

	it('names the box a colour can only have come out of', () => {
		expect(boxForSpawnColor(SpawnColor.Purple)).toBe(SpawnBox.White);
		expect(boxForSpawnColor(SpawnColor.Green)).toBe(SpawnBox.White);
		expect(boxForSpawnColor(SpawnColor.Orange)).toBe(SpawnBox.White);
		expect(boxForSpawnColor(SpawnColor.Red)).toBe(SpawnBox.Black);
		expect(boxForSpawnColor(SpawnColor.Blue)).toBe(SpawnBox.Black);
		expect(boxForSpawnColor(SpawnColor.Yellow)).toBe(SpawnBox.Black);
	});

	it('isSpawnBox recognises only the two stocks', () => {
		expect(isSpawnBox('white')).toBe(true);
		expect(isSpawnBox('black')).toBe(true);
		expect(isSpawnBox('grey')).toBe(false);
		expect(isSpawnBox(null)).toBe(false);
	});

	it('isSpawnColor recognises only known values', () => {
		expect(isSpawnColor('red')).toBe(true);
		expect(isSpawnColor('purple')).toBe(true);
		expect(isSpawnColor('magenta')).toBe(false);
		expect(isSpawnColor(null)).toBe(false);
		expect(isSpawnColor(42)).toBe(false);
	});
});
