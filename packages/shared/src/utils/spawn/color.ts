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

/**
 * Each spawn colour as a 24-bit RGB hex, matching the Tailwind swatches used in
 * the DOM (red/blue/orange/green/purple 500, yellow 400) so a Pixi-painted
 * backdrop reads the same colour as the badges elsewhere.
 */
export const SPAWN_COLOR_HEX: Record<SpawnColor, number> = {
	[SpawnColor.Red]: 0xef4444,
	[SpawnColor.Yellow]: 0xfacc15,
	[SpawnColor.Blue]: 0x3b82f6,
	[SpawnColor.Orange]: 0xf97316,
	[SpawnColor.Green]: 0x22c55e,
	[SpawnColor.Purple]: 0xa855f7
};

/**
 * Each spawn colour as a CSS colour value — the very variable Tailwind emits for
 * the swatch behind `bg-red-500` & co, so a colour painted outside the class
 * system (a Leaflet stroke or fill, say) tracks the theme's palette instead of
 * pinning its own copy of it. The literal fallback matters: the variable is only
 * emitted while some utility in the app still spells that swatch, and an
 * unresolvable `var()` computes to `none` — silently erasing whatever it paints.
 */
export const SPAWN_COLOR_CSS: Record<SpawnColor, string> = {
	[SpawnColor.Red]: 'var(--color-red-500, oklch(63.7% 0.237 25.331))',
	[SpawnColor.Yellow]: 'var(--color-yellow-400, oklch(85.2% 0.199 91.936))',
	[SpawnColor.Blue]: 'var(--color-blue-500, oklch(62.3% 0.214 259.815))',
	[SpawnColor.Orange]: 'var(--color-orange-500, oklch(70.5% 0.213 47.604))',
	[SpawnColor.Green]: 'var(--color-green-500, oklch(72.3% 0.219 149.579))',
	[SpawnColor.Purple]: 'var(--color-purple-500, oklch(62.7% 0.265 303.9))'
};

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
