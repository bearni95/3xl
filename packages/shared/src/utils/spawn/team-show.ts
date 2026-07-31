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

/** A town's sitting team as a holder row carries it: the lead first. */
export interface HeldTown {
	/** The town, as its geojson feature id. */
	locationId: string;
	/** The occupying team in fielded order — only the first member is read. */
	team: readonly { characterId: string }[];
}

/**
 * Municipality id → the show its occupying team flies, for every town somebody
 * holds: the sitting lead's show, by {@link teamShowId}.
 *
 * This is what makes a conquest re-label a town — the show on its pin, and the
 * show its booster boxes deal. A town nobody holds is absent, and so is one whose
 * lead belongs to no show: both fall back to the show the town's own geometry
 * seeds it with (see utils/geo/municipality-show.ts), which is the only show a
 * town has until it is first taken.
 *
 * Recomputed from the holders as they stand, never stored: taking a town rewrites
 * its holder row, and the next read of this is already the new show.
 */
export function holderShowIds(
	holders: Iterable<HeldTown>,
	showIdsByCharacter: ReadonlyMap<string, number[]>
): Map<string, number> {
	const byLocation = new Map<string, number>();
	for (const holder of holders) {
		const showId = teamShowId(
			holder.team.map((member) => member.characterId),
			showIdsByCharacter
		);
		if (showId != null) byLocation.set(holder.locationId, showId);
	}
	return byLocation;
}

/**
 * Reverse a show → character-ids assignment into character id → the shows it
 * belongs to, the direction {@link teamShowId} reads it in. Each character's show
 * list keeps the order the shows were walked in, so a character in several shows
 * resolves to the same one every time.
 *
 * The apps walk the shows in name order (`spawnService.loadShows` sorts them), so
 * a character on several shows answers with the alphabetically first — the same
 * order `claim_booster` breaks the tie in, which is what keeps the box a town's
 * pin shows and the pool the server rolls from the same show.
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
