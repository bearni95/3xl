/**
 * card-gif
 *
 * Renders a {@link RevealCardSprite} offscreen — exactly the card the claim page
 * reveals when a booster pack is opened — and encodes its looping idle animation
 * into an animated GIF. Used by the `/card` route so a claimed card can be viewed
 * (and shared) as a plain image.
 *
 * The card is drawn on an opaque backing so the exported frames carry no
 * transparency (its rounded corners reveal the backing instead), which keeps the
 * GIF quantisation simple. Each idle frame becomes one GIF frame, using the
 * animation's own per-frame duration as the GIF delay so the loop matches the
 * in-canvas playback; a face-only card (no idle clip) exports a single frame.
 */

import { Application, Graphics, RenderTexture } from 'pixi.js';
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { RevealCardSprite } from './RevealCardSprite';
import type { ClaimPull } from './pull.type';

/** Portrait trading-card aspect (width / height) — matches ClaimPackScene. */
const CARD_ASPECT = 2 / 3;
/** Default exported card width in pixels. */
const DEFAULT_WIDTH = 320;
/** Opaque backing colour behind the card (DaisyUI dark base-300-ish). */
const BACKGROUND = 0x1d232a;
/** GIF delay (ms) for a static, face-only card that has no idle animation. */
const STATIC_FRAME_DELAY = 120;

export interface RenderCardGifOptions {
	/** Element to mount the (hidden) render canvas in. Defaults to fully offscreen. */
	host?: HTMLElement;
	/** Exported width in pixels; height follows the card aspect. */
	width?: number;
}

/** Render `pull` as an animated-GIF card and return it as an `image/gif` Blob. */
export async function renderCardGif(
	pull: ClaimPull,
	options: RenderCardGifOptions = {}
): Promise<Blob> {
	const width = Math.round(options.width ?? DEFAULT_WIDTH);
	const height = Math.round(width / CARD_ASPECT);

	const app = new Application();
	await app.init({
		width,
		height,
		backgroundColor: BACKGROUND,
		backgroundAlpha: 1,
		antialias: true,
		resolution: 1,
		autoDensity: false
	});
	if (options.host) {
		app.canvas.style.display = 'none';
		options.host.appendChild(app.canvas);
	}

	// Opaque backing rect so every captured frame is fully opaque.
	const bg = new Graphics();
	bg.rect(0, 0, width, height);
	bg.fill(BACKGROUND);
	app.stage.addChild(bg);

	// The exact card the claim page reveals, but in manual (capture) animation mode.
	const card = new RevealCardSprite({ pull, width, height, app, animate: false });
	app.stage.addChild(card);
	await card.ready;

	const target = RenderTexture.create({ width, height, resolution: 1 });
	const gif = GIFEncoder();

	const captureFrame = (delay: number): void => {
		app.renderer.render({ container: app.stage, target });
		const { pixels } = app.renderer.extract.pixels(target);
		const palette = quantize(pixels, 256);
		const index = applyPalette(pixels, palette);
		gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
	};

	const frameCount = card.idleFrameCount;
	if (frameCount > 0) {
		const delays = card.idleFrameDelays();
		for (let i = 0; i < frameCount; i++) {
			card.showIdleFrame(i);
			captureFrame(delays[i] ?? STATIC_FRAME_DELAY);
		}
	} else {
		// Face-only fallback: a single static frame.
		captureFrame(STATIC_FRAME_DELAY);
	}

	gif.finish();
	// Copy into a fresh, non-shared ArrayBuffer so the bytes are a valid BlobPart.
	const bytes = gif.bytes();
	const out = new Uint8Array(bytes.length);
	out.set(bytes);

	target.destroy(true);
	app.destroy(true, { children: true, texture: false });

	return new Blob([out], { type: 'image/gif' });
}
