import type { Manifest } from '$utils/mugen/mugen-player';

export interface MugenAnimationOptions {
	/** Folder (relative to the static root) holding manifest.json + frame PNGs. */
	basePath: string;
	/** Manifest animation key to loop. */
	animation: string;
}

/** One preloaded frame: its image URL and how long it shows for. */
interface Frame {
	url: string;
	duration: number;
}

/**
 * Loops a single named MUGEN animation as a plain DOM `<img>`, swapping the
 * source frame-by-frame on a requestAnimationFrame timer. Deliberately DOM-based
 * (no PixiJS / WebGL): the /admin/characters editor shows one preview per move
 * plus the projectile, and giving each its own WebGL context would exhaust the
 * browser's context limit and evict the big frame sheet's canvas. A `<img>`
 * costs nothing, so previews scale freely.
 *
 * All playback state lives here so the Svelte component stays UI-only.
 */
export class MugenAnimationPlayer {
	private readonly basePath: string;
	private readonly animation: string;

	private img: HTMLImageElement | null = null;
	private frames: Frame[] = [];
	private index = 0;
	private renderedIndex = -1;
	private elapsed = 0;
	private lastTs = 0;
	private rafId = 0;
	private destroyed = false;

	constructor(options: MugenAnimationOptions) {
		this.basePath = options.basePath;
		this.animation = options.animation;
	}

	/** Load the animation's frames, mount an `<img>` in `container` and loop. */
	async start(container: HTMLElement): Promise<void> {
		const response = await fetch(`${this.basePath}/manifest.json`);
		if (!response.ok) throw new Error(`Failed to load manifest: ${response.status}`);
		const manifest: Manifest = await response.json();

		const anim = manifest.animations[this.animation];
		if (!anim) throw new Error(`Animation "${this.animation}" missing in ${this.basePath}/manifest.json`);

		this.frames = anim.frames.map((frame) => ({
			url: `${this.basePath}/${frame.file}`,
			duration: frame.duration
		}));

		// Preload every frame so cycling never flashes a not-yet-decoded image.
		await Promise.all(this.frames.map((frame) => preload(frame.url)));
		if (this.destroyed || this.frames.length === 0) return;

		const img = document.createElement('img');
		// Fill the host box, keep pixel art crisp. Arbitrary-property class rather
		// than an inline style so the component stays style-tag/inline-style free.
		img.className = 'h-full w-full object-contain [image-rendering:pixelated]';
		img.decoding = 'async';
		img.src = this.frames[0].url;
		this.renderedIndex = 0;
		container.appendChild(img);
		this.img = img;

		this.lastTs = performance.now();
		this.rafId = requestAnimationFrame(this.tick);
	}

	/** Stop the loop and remove the image. Safe to call more than once. */
	destroy(): void {
		this.destroyed = true;
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.img?.remove();
		this.img = null;
		this.frames = [];
	}

	private tick = (ts: number): void => {
		if (this.destroyed || !this.img) return;
		const deltaMs = ts - this.lastTs;
		this.lastTs = ts;

		if (this.frames.length > 1) {
			this.elapsed += deltaMs;
			let guard = this.frames.length;
			while (this.elapsed >= this.frames[this.index].duration && guard-- > 0) {
				this.elapsed -= this.frames[this.index].duration;
				this.index = (this.index + 1) % this.frames.length;
			}
			if (this.index !== this.renderedIndex) {
				this.img.src = this.frames[this.index].url;
				this.renderedIndex = this.index;
			}
		}

		this.rafId = requestAnimationFrame(this.tick);
	};
}

/** Resolve once the image at `url` has loaded (or errored — never rejects). */
function preload(url: string): Promise<void> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => resolve();
		image.onerror = () => resolve();
		image.src = url;
	});
}
