import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ORDER_ICONS } from '$utils/color/traits';

/**
 * The shape of the three glyph files the board draws into its canvas.
 *
 * An SVG has no resolution until something rasterises it, and Pixi rasterises one at the
 * size the file declares. So what these files say about their own size decides how much
 * artwork the canvas ever gets — and all three of them used to say `width="1em"`, which is
 * 16px in a standalone document. They were being baked into 16×16 bitmaps and drawn at
 * three times that: the whole of why they looked fuzzy. The `1em` belongs to the *inlined*
 * show icons, whose whole point is to follow the surrounding type; on a glyph that goes
 * into a texture it is nothing but a resolution cap.
 *
 * The board no longer inherits it — it names its own raster square (`ICON_RASTER_PX`) —
 * but these files are shared with two `<img>` consumers (the statue's order row, the
 * admin's icon picker) that size themselves in CSS, so nothing anywhere wants a size
 * baked in here. This checks they stay in the form their 4,180 siblings are in, because
 * the way that broke was invisible from every line of code that depended on it.
 */
const iconPath = (url: string): string => `../assets/public${url.replace(/^\/assets/, '')}`;

/** The `<svg …>` opening tag, which is where anything about size would be. */
const rootTag = (svg: string): string =>
	svg.slice(svg.indexOf('<svg'), svg.indexOf('>', svg.indexOf('<svg')) + 1);

describe('the glyph files the board rasterises', () => {
	const icons = Object.entries(ORDER_ICONS);

	it('names three glyphs that are actually on disk', () => {
		expect(icons).toHaveLength(3);
		for (const [, url] of icons) {
			expect(readFileSync(iconPath(url), 'utf8')).toContain('<svg');
		}
	});

	it.each(icons)('leaves %s free of any size of its own', (_order, url) => {
		const root = rootTag(readFileSync(iconPath(url), 'utf8'));

		// No width or height: a declared size is the resolution the canvas would be stuck
		// with, and `1em` — the inlined set's sizing — is 16px of it.
		expect(root).not.toMatch(/\swidth=/);
		expect(root).not.toMatch(/\sheight=/);

		// Square, which is the shape the raster square assumes. A viewBox of another shape
		// still comes out undistorted, just smaller than the coin it was measured for.
		const viewBox = /viewBox="([^"]+)"/.exec(root)?.[1]?.trim().split(/\s+/);
		expect(viewBox).toHaveLength(4);
		expect(Number(viewBox![2])).toBe(Number(viewBox![3]));
	});

	it('carries white artwork, which is what makes the tint reachable', () => {
		// A canvas tint only ever darkens, so these are stored white and coloured on the way
		// in. Vendored in game-icons.net's `ffffff / transparent` variant, and this is what
		// says so — the other variant would bring an opaque black square with it.
		for (const [, url] of icons) {
			expect(rootTag(readFileSync(iconPath(url), 'utf8'))).toMatch(/fill="#fff(fff)?"/i);
		}
	});
});
