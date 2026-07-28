// Tell which TV show a team belongs to.
//
// A team's show is its LEAD's show — the character in the first slot, exactly as
// the roster defines it (the lead is the first filled member, and the shows it
// belongs to are the team's shows). The rest of the line-up does not
// get a vote: a team led by a One Piece character is a One Piece team even with two
// Dragon Ball fighters behind it.
//
// A character's shows come from the Supabase `show_characters` assignment, keyed
// the other way round (show → characters), so `showIdsByCharacter` flips it first.

/**
 * The id of the show a team belongs to: the first show its lead (the first member)
 * is assigned to. Null when the team is empty or its lead belongs to no show —
 * never guessed from the members behind the lead.
 */
export function teamShowId(
	characterIds: readonly string[],
	showIdsByCharacter: ReadonlyMap<string, number[]>
): number | null {
	const lead = characterIds[0];
	if (!lead) return null;
	return showIdsByCharacter.get(lead)?.[0] ?? null;
}

/**
 * Reverse a show → character-ids assignment into character id → the shows it
 * belongs to, the direction {@link teamShowId} reads it in. Each character's show
 * list keeps the order the shows were walked in, so a character in several shows
 * resolves to the same one every time.
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
