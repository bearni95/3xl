import { SpawnColor } from '../../types/character-spawn.type';

/**
 * The weighted spawn-colour pool. The three primaries (red/yellow/blue) each
 * carry weight 3; the three secondaries (orange/green/purple) each carry weight
 * 1 — making every secondary three times as rare as any primary. Total weight is
 * 12, so each primary lands ~25% of the time and each secondary ~8.3%.
 */
export const SPAWN_COLOR_WEIGHTS: ReadonlyArray<readonly [SpawnColor, number]> = [
	[SpawnColor.Red, 3],
	[SpawnColor.Yellow, 3],
	[SpawnColor.Blue, 3],
	[SpawnColor.Orange, 1],
	[SpawnColor.Green, 1],
	[SpawnColor.Purple, 1]
];

/** Pick a spawn colour at random, respecting {@link SPAWN_COLOR_WEIGHTS}. */
export function randomSpawnColor(): SpawnColor {
	const total = SPAWN_COLOR_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
	let roll = Math.random() * total;
	for (const [color, weight] of SPAWN_COLOR_WEIGHTS) {
		roll -= weight;
		if (roll < 0) return color;
	}
	// Unreachable: the weights always sum to `total`.
	return SPAWN_COLOR_WEIGHTS[0][0];
}

/** Whether `value` is one of the known {@link SpawnColor} values. */
export function isSpawnColor(value: unknown): value is SpawnColor {
	return (
		typeof value === 'string' &&
		(Object.values(SpawnColor) as string[]).includes(value)
	);
}
