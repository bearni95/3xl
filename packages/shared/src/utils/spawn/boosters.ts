import type { Booster, CharacterSpawn } from '../../types/character-spawn.type';

/**
 * Group a player's spawns into the booster packs they were opened in.
 *
 * A pack is opened as a single `character_spawns` insert (see `claimBooster`), so
 * all its cards share one `created_at` — Postgres `now()` is the transaction
 * timestamp, constant across every row of one statement — alongside the same show
 * and location. Grouping by that (`createdAt` + `showId` + `locationId`) triple
 * reconstructs each pack, and keeps two packs opened at the same instant in
 * different places (or from different shows) apart.
 *
 * Packs come out newest first when the input is newest first (as
 * `spawnService.loadSpawns` returns it): a `Map` preserves insertion order, so the
 * first card seen for each pack fixes that pack's position, and cards keep the order
 * they arrive in within their pack.
 */
export function groupSpawnsIntoBoosters(spawns: CharacterSpawn[]): Booster[] {
	const byKey = new Map<string, Booster>();
	for (const spawn of spawns) {
		const key = `${spawn.createdAt}|${spawn.showId ?? ''}|${spawn.locationId}`;
		const existing = byKey.get(key);
		if (existing) {
			existing.spawns.push(spawn);
			continue;
		}
		byKey.set(key, {
			id: key,
			openedAt: spawn.createdAt,
			showId: spawn.showId,
			locationId: spawn.locationId,
			spawns: [spawn]
		});
	}
	return [...byKey.values()];
}
