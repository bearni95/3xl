// A song the game can play. There is one player, in the map's corner, and it plays
// the show themes vendored in @3xl/assets — so a track is an asset that is on disk
// plus the two things the player has to letter it with: what it is called, and which
// show it belongs to.
//
// The asset is the fact and the definition answers it: the files are dropped into
// @3xl/assets' `public/music/`, and the admin `/music` screen lists whatever is
// found there and authors an entry per file into @3xl/data's `public/music.json`.
// A file with no entry is a song nobody has said anything about yet, and an entry
// whose file is gone is a definition of nothing — both are states the admin shows,
// and neither is playable.

/**
 * A vendored song's file name, which is also the entry's key. Slug-named mp3s, as
 * `@3xl/assets`' other hand-dropped assets are; the pattern is what keeps a
 * definition from naming anything but a file in that one folder.
 */
export const MUSIC_FILE_PATTERN = /^[a-z0-9-]+\.mp3$/;

/** A title is a line on a plate in the corner of the map, not a paragraph. */
export const MUSIC_TITLE_MAX_LENGTH = 60;

/** One playable track: an asset in @3xl/assets, and what is authored about it. */
export interface MusicTrack {
	/**
	 * The asset's file name under `public/music/`, e.g. `one-piece-we-are.mp3`. The
	 * collection is keyed by it — the file is the thing that exists, so nothing else
	 * would do as the id.
	 */
	file: string;
	/** The song's own title, as it is lettered in the player. */
	title: string;
	/**
	 * TMDB show id, the same key `shows.json`, the municipality assignment and
	 * `showIconName` all use — so the track can be badged with the show's glyph and
	 * named by the show the player already sees on the map. Null for a song linked to
	 * no show, which is lettered by title alone.
	 */
	showId: number | null;
}

/** The authored collection, as `public/music.json` holds it. */
export interface MusicCollection {
	tracks: MusicTrack[];
}
