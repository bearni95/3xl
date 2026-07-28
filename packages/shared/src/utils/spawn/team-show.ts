// Name the TV show a team belongs to.
//
// A team is just a list of characters, and every character is assigned to zero or
// more Supabase shows (`show_characters` → `show_templates`, loaded by the spawn
// service). A team drawn from a booster usually shares one show, but nothing stops
// a player fielding characters from several — so the team's show is the one most of
// its members belong to, with the first-fielded member breaking a tie (a team is
// stored in the order it was won with, so its lead speaks for it).

/**
 * The show name most of `characterIds` belong to, or null when none of them is
 * assigned to any show. Ties go to whichever tied show the earliest member in the
 * list belongs to.
 */
export function teamShowName(
	characterIds: readonly string[],
	showNamesByCharacter: ReadonlyMap<string, string[]>
): string | null {
	const counts = new Map<string, number>();
	// Insertion order records where each show was first seen, which is what breaks
	// a tie: Map iteration below walks the shows in that order.
	for (const characterId of characterIds) {
		for (const name of showNamesByCharacter.get(characterId) ?? []) {
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
	}

	let best: string | null = null;
	let bestCount = 0;
	for (const [name, count] of counts) {
		if (count > bestCount) {
			best = name;
			bestCount = count;
		}
	}
	return best;
}
