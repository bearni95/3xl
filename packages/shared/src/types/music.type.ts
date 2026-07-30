// A song the game can play. There is one player, in the map's corner, and it plays
// the show themes vendored in @3xl/assets — so a track is a file plus the two things
// the player has to letter it with: what it is called, and which show it belongs to.

/** One playable track. */
export interface MusicTrack {
	/** Stable id, the asset's basename — also what the player keys its list by. */
	id: string;
	/** The song's own title, as it is lettered in the player. */
	title: string;
	/**
	 * TMDB show id, the same key `shows.json`, the municipality assignment and
	 * `showIconName` all use — so the track can be badged with the show's glyph and
	 * named by the show the player already sees on the map. Null for a track that
	 * belongs to no show in the game, which is lettered by title alone.
	 */
	showId: number | null;
	/** Where the file is served from, under @3xl/assets' `/assets` prefix. */
	src: string;
}
