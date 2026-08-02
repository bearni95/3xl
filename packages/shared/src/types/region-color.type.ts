/**
 * The colours a *place* can be drawn in, which is one more than the colours a
 * *card* can be rolled in.
 *
 * Everything a region flies is read off the team standing on it — its lead's
 * colour, exactly as its show is its lead's show — and every one of those is a
 * {@link SpawnColor}, because a team is made of cards. But a town nobody has
 * challenged yet fields the team its own seed rolled, and that team belongs to
 * nobody: painting it in its lead's colour said "somebody's red holds this" about
 * a place that is simply unheld, and made a conquest invisible on a map already
 * covered in the six.
 *
 * So the map has one colour of its own — {@link ArtificialColor}, artificial in
 * the plain sense that no roll can produce it and no card can be it. It is the
 * map speaking about a place rather than reporting somebody's team, and it is
 * reachable from nowhere a card's colour is: `claim_booster` cannot deal it and
 * `randomSpawnColor` cannot land on it.
 */

import type { SpawnColor } from './character-spawn.type';

/**
 * A colour the map paints itself, standing for a fact about a place instead of
 * for a team's colour.
 */
export enum ArtificialColor {
	/**
	 * Nobody holds this place: it still fields the team its seed rolled, and no
	 * player has taken it off that team. Grey is what the whole map is before the
	 * first conquest, which is the point — a colour on it is then somebody's doing.
	 */
	Gray = 'gray'
}

/**
 * Any colour a region may fly: the six a card can be rolled in, plus the map's
 * own. Every surface that paints a region — the polygon wash, the pins' tiles,
 * the breadcrumb squares — takes this, while anything painting a *card* (a
 * statue, an avatar ring, a lineup cell) keeps taking {@link SpawnColor} and is
 * unaffected.
 */
export type RegionColor = SpawnColor | ArtificialColor;
