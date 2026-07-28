// Tell which TV show a team belongs to.
//
// A team is just a list of characters, and every character is assigned to zero or
// more Supabase shows (`show_characters`, loaded by the spawn service). A team
// pulled from one booster usually shares a single show, but nothing stops a player
// fielding characters from several — so the team's show is the one most of its
// members belong to, with the first-fielded member breaking a tie (a holder's team
// is stored in the order it was won with, so its lead speaks for it).

/**
 * The id of the show most of `characterIds` belong to, or null when none of them
 * is assigned to any show. Ties go to whichever tied show the earliest member in
 * the list belongs to.
 */
export function teamShowId(
	characterIds: readonly string[],
	showIdsByCharacter: ReadonlyMap<string, number[]>
): number | null {
	const counts = new Map<number, number>();
	// Insertion order records where each show was first seen, which is what breaks
	// a tie: the scan below walks the shows in that order.
	for (const characterId of characterIds) {
		for (const showId of showIdsByCharacter.get(characterId) ?? []) {
			counts.set(showId, (counts.get(showId) ?? 0) + 1);
		}
	}

	let best: number | null = null;
	let bestCount = 0;
	for (const [showId, count] of counts) {
		if (count > bestCount) {
			best = showId;
			bestCount = count;
		}
	}
	return best;
}

/**
 * Reverse a show → character-ids assignment into character id → the shows it
 * belongs to, the direction {@link teamShowId} reads it in. Each character's show
 * list keeps the order the shows were walked in, so the tie-break above is stable.
 */
export function showIdsByCharacter(
	charactersByShow: ReadonlyMap<number, string[]>
): Map<string, number[]> {
	const byCharacter = new Map<string, number[]>();
	for (const [showId, characterIds] of charactersByShow) {
		for (const characterId of characterIds) {
			const shows = byCharacter.get(characterId);
			if (shows) shows.push(showId);
			else byCharacter.set(characterId, [showId]);
		}
	}
	return byCharacter;
}
