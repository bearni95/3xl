// What the map's music player has to play.
//
// The files are vendored in @3xl/assets under `public/music/` and served at
// /assets/music/<id>.mp3, the same way every sprite frame and icon in that package
// is. The list is hand-maintained, like `showIconName`'s map is: a track is authored
// content — a title and the show it opens — and there is nothing in an mp3 to derive
// either from.
//
// Order is playing order: the player steps through this list and wraps at the end.

import type { MusicTrack } from '../../types/music.type';

/** Every playable track, in the order the player steps through them. */
export const MUSIC_TRACKS: readonly MusicTrack[] = [
	{
		id: 'one-piece-we-are',
		title: 'We are',
		showId: 37854,
		src: '/assets/music/one-piece-we-are.mp3'
	},
	{
		id: 'inuyasha-change-the-world',
		title: 'Change the world',
		showId: 35610,
		src: '/assets/music/inuyasha-change-the-world.mp3'
	}
];
