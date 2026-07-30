// Where a song is served from.
//
// The files are vendored in @3xl/assets under `public/music/`, which every app
// mounts at `/assets` — so a track's URL is its file name under that one folder, and
// nothing about a track has to say where it lives. What is authored about each of
// them (its title and the show it opens) is @3xl/data's `public/music.json`, written
// by the admin `/music` screen; this is the only thing about a track that is derived
// rather than authored.

/** The folder the vendored songs are served from, under each app's `/assets` mount. */
export const MUSIC_ASSET_PREFIX = '/assets/music';

/** The URL a song's file is served at. */
export function musicTrackSrc(file: string): string {
	return `${MUSIC_ASSET_PREFIX}/${file}`;
}
