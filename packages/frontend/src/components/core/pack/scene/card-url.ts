/**
 * card-url
 *
 * Builds the `/card` route URL for a revealed {@link ClaimPull}. The route
 * re-derives everything else (label, frames, face) from the character registry,
 * so only the identity + rolled values need to travel in the query string:
 * character id, spawn colour, ATK stat, and optional rarity + claim location.
 */

import type { ClaimPull } from './pull.type';

/** `/card?…` link that renders `pull` as an animated card on the card route. */
export function cardHref(pull: ClaimPull): string {
	const params = new URLSearchParams();
	params.set('id', pull.spawn.characterId);
	params.set('color', pull.color);
	params.set('stat', String(pull.atk));
	if (pull.rarity != null) params.set('rarity', String(pull.rarity));
	if (pull.locationName) params.set('loc', pull.locationName);
	return `/card?${params.toString()}`;
}
