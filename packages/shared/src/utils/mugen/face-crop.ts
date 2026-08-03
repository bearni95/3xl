import type { FaceCrop } from '$types/character-definition.type';

/**
 * Square framing of a character's face sprite: the region authored in the admin
 * `/characters/dashboard/<id>/faces` screen (`definition.faceCrop`) and rendered by the avatar
 * picker and the account card. Coordinates are the face file's own pixels, so
 * every helper here needs the sprite's intrinsic size to stay in bounds.
 */

/**
 * The square a face starts on before anyone frames it: as wide as the sprite
 * allows, anchored to its top edge and centred horizontally — where a portrait's
 * head sits in the tall group-9000 sprites MUGEN ships.
 */
export function defaultFaceCrop(width: number, height: number): FaceCrop {
	const size = Math.max(1, Math.min(Math.round(width), Math.round(height)));
	return { x: Math.round((width - size) / 2), y: 0, size };
}

/**
 * The nearest square inside the sprite: the side is capped to the shorter edge
 * and the origin pulled back so the whole square lands on the image. Values are
 * rounded to whole pixels — a crop is authored by dragging, and fractional
 * pixels only make the JSON noisy.
 */
export function clampFaceCrop(crop: FaceCrop, width: number, height: number): FaceCrop {
	const size = Math.max(1, Math.min(Math.round(crop.size), Math.round(width), Math.round(height)));
	return {
		x: Math.max(0, Math.min(Math.round(crop.x), Math.round(width) - size)),
		y: Math.max(0, Math.min(Math.round(crop.y), Math.round(height) - size)),
		size
	};
}

/** Whether two crops frame the same square (used to spot unsaved edits). */
export function sameFaceCrop(a: FaceCrop | null, b: FaceCrop | null): boolean {
	if (!a || !b) return a === b;
	return a.x === b.x && a.y === b.y && a.size === b.size;
}

/**
 * The crop as an SVG `viewBox`. Rendering a framed face is an `<svg>` with this
 * box around an `<image>` drawn at the sprite's intrinsic size — the square then
 * scales to whatever box the layout gives it, with no cropping maths in the UI.
 */
export function faceViewBox(crop: FaceCrop): string {
	return `${crop.x} ${crop.y} ${crop.size} ${crop.size}`;
}
