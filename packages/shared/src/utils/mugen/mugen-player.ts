import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { destroyPixiApp } from '../pixi/release-context';

/** One decoded animation frame as described by the generated manifest. */
export interface ManifestFrame {
	file: string;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	duration: number;
}

export interface ManifestAnimation {
	loop: boolean;
	frames: ManifestFrame[];
}

/** The character's portrait ("face"), decoded from MUGEN sprite group 9000. */
export interface ManifestFace {
	file: string;
	width: number;
	height: number;
	/**
	 * The sprite's group-9000 image number: 0 is the small select-screen avatar,
	 * 1 the large versus portrait, higher numbers character-specific alternates.
	 * Only set on the `faces` list entries; omitted on the single `face` default,
	 * and on a portrait the author uploaded (which came from no sprite group).
	 */
	image?: number;
	/**
	 * Set on a portrait the author uploaded on the admin's Faces screen rather than
	 * one decoded from the archive. It is stored in @3xl/data and copied into this
	 * folder on every decode (see @3xl/mugen/custom-faces), so everything that reads
	 * a face treats it like any other; the flag is only how the Faces screen labels
	 * it and how a re-copy tells the uploaded set from the decoded one.
	 */
	custom?: boolean;
}

export interface Manifest {
	name: string;
	author: string;
	/**
	 * The default portrait sprite (large versus portrait, else the small avatar),
	 * or null when the character ships none in group 9000. Kept for consumers that
	 * read a single portrait; the board prefers the one the definition selects.
	 */
	face: ManifestFace | null;
	/**
	 * Every portrait the character ships in group 9000, in image-number order —
	 * what the admin Faces tab lists so an author can pick which one the board
	 * shows. Absent on manifests generated before portraits were enumerated.
	 */
	faces?: ManifestFace[];
	animations: Record<string, ManifestAnimation>;
}

/** A frame with its loaded texture and pre-computed anchor fractions. */
interface LoadedFrame {
	texture: Texture;
	anchorX: number;
	anchorY: number;
	duration: number;
}

export interface MugenPlayerOptions {
	/** Folder (relative to the static root) holding manifest.json + frame PNGs. */
	basePath?: string;
	/** Integer-ish factor the pixel art is scaled up by. */
	scale?: number;
	/** Walking speed in canvas pixels per second (before art scaling). */
	speed?: number;
	/** Running speed, used after a double-tap. Defaults to ~2.4x walk speed. */
	runSpeed?: number;
	/** Max gap (ms) between two taps of the same arrow to trigger a run. */
	doubleTapMs?: number;
	backgroundColor?: number;
}

const DEFAULTS = {
	basePath: '/assets/kikyo/frames',
	scale: 2.5,
	speed: 90,
	runSpeed: 220,
	doubleTapMs: 260,
	backgroundColor: 0x1d232a
};

/** Arrow keys mapped to a horizontal direction. */
const KEY_DIRECTION: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

// Only the movement animations the game loop drives. Manifests now carry a
// character's full moveset (100+ animations); loading them all here would pull
// hundreds of unused textures onto the play page, so we load just these.
const GAME_ANIMATIONS = new Set(['idle', 'walk', 'run']);

/**
 * Renders a MUGEN character on a PixiJS canvas and drives idle/walk/run
 * animation plus left/right movement. Double-tapping an arrow starts a run.
 * Frame decoding happens at build time (scripts/generate-kikyo-sprites.js);
 * this class only plays the result.
 *
 * All rendering state lives here so the Svelte component stays UI-only.
 */
export class MugenPlayer {
	private readonly options: Required<MugenPlayerOptions>;
	private app: Application | null = null;
	// Set the moment teardown starts, so a boot already in flight can bail out
	// instead of resurrecting a destroyed player.
	private destroyed = false;
	private sprite: Sprite | null = null;
	private animations: Record<string, LoadedFrame[]> = {};

	// Playback state.
	private currentName = 'idle';
	private frameIndex = 0;
	private frameElapsed = 0;

	// Movement state. facing: 1 = right, -1 = left.
	private facing = 1;
	private positionX = 0;
	private readonly held = new Set<string>();

	// Vertical baseline: the y where the character's feet rest on the ground line.
	private groundY = 0;

	// Double-tap / run state.
	private runningDirection = 0;
	private readonly lastTapTime: Record<string, number> = {
		ArrowLeft: Number.NEGATIVE_INFINITY,
		ArrowRight: Number.NEGATIVE_INFINITY
	};

	constructor(options: MugenPlayerOptions = {}) {
		this.options = { ...DEFAULTS, ...options };
	}

	/** Boot Pixi inside `container`, load assets and start the game loop. */
	async start(container: HTMLElement, width: number, height: number): Promise<Manifest> {
		const app = new Application();
		await app.init({
			width,
			height,
			backgroundColor: this.options.backgroundColor,
			antialias: false,
			roundPixels: true
		});
		// The host can unmount while the boot is in flight. Without this the app would
		// be created after destroy() had already run, stranding a WebGL context and a
		// render loop nothing can reach — and browsers only allow a handful of
		// contexts, so enough strays force-lose the oldest live one and blank whatever
		// canvas that was.
		if (this.destroyed) {
			destroyPixiApp(app);
			throw new Error('MugenPlayer was destroyed while starting');
		}
		this.app = app;
		container.appendChild(app.canvas);

		const manifest = await this.loadAssets();
		if (this.destroyed) throw new Error('MugenPlayer was destroyed while starting');

		this.drawGround(width, height);

		this.sprite = new Sprite();
		this.sprite.scale.set(this.options.scale);
		app.stage.addChild(this.sprite);

		// Start centred, standing on the ground line.
		this.positionX = width / 2;
		this.groundY = height - Math.round(height * 0.12);
		this.applyFrame();

		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		app.ticker.add(this.tick);

		return manifest;
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		this.destroyed = true;
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.held.clear();
		if (this.app) {
			destroyPixiApp(this.app);
			this.app = null;
		}
		this.sprite = null;
		this.animations = {};
	}

	private async loadAssets(): Promise<Manifest> {
		const { basePath } = this.options;
		const response = await fetch(`${basePath}/manifest.json`);
		if (!response.ok) {
			throw new Error(`Failed to load manifest: ${response.status}`);
		}
		const manifest: Manifest = await response.json();

		for (const [name, animation] of Object.entries(manifest.animations)) {
			if (!GAME_ANIMATIONS.has(name)) continue;
			const frames: LoadedFrame[] = [];
			for (const frame of animation.frames) {
				const texture = await Assets.load<Texture>(`${basePath}/${frame.file}`);
				// Keep the pixel art crisp when scaled up.
				texture.source.scaleMode = 'nearest';
				frames.push({
					texture,
					anchorX: frame.anchorX / frame.width,
					anchorY: frame.anchorY / frame.height,
					duration: frame.duration
				});
			}
			this.animations[name] = frames;
		}

		return manifest;
	}

	private drawGround(width: number, height: number): void {
		if (!this.app) return;
		const groundY = height - Math.round(height * 0.12);
		const ground = new Graphics()
			.moveTo(0, groundY)
			.lineTo(width, groundY)
			.stroke({ width: 2, color: 0x3a4453, alpha: 0.9 });
		const container = new Container();
		container.addChild(ground);
		this.app.stage.addChild(container);
	}

	/** Switch the active animation, resetting playback if it actually changed. */
	private setAnimation(name: string): void {
		if (this.currentName === name || !this.animations[name]) return;
		this.currentName = name;
		this.frameIndex = 0;
		this.frameElapsed = 0;
	}

	/** Push the current frame's texture, anchor, facing and position to Pixi. */
	private applyFrame(): void {
		if (!this.sprite) return;
		const frames = this.animations[this.currentName];
		if (!frames || frames.length === 0) return;
		const frame = frames[this.frameIndex % frames.length];

		this.sprite.texture = frame.texture;
		this.sprite.anchor.set(frame.anchorX, frame.anchorY);
		// Flip around the anchor (the body) by mirroring the horizontal scale.
		this.sprite.scale.x = this.options.scale * this.facing;
		this.sprite.x = this.positionX;
		this.sprite.y = this.groundY;
	}

	private tick = (): void => {
		if (!this.app || !this.sprite) return;
		const deltaMs = this.app.ticker.deltaMS;
		const deltaSeconds = deltaMs / 1000;

		// Resolve horizontal input into a direction (-1, 0, +1). Horizontal
		// movement applies both on the ground and in the air (air control).
		const left = this.held.has('ArrowLeft');
		const right = this.held.has('ArrowRight');
		const direction = Number(right) - Number(left);
		const running = direction !== 0 && this.runningDirection === direction;

		if (direction !== 0) {
			this.facing = direction;
			const speed = running ? this.options.runSpeed : this.options.speed;
			this.positionX += direction * speed * deltaSeconds;
			this.clampPosition();
		}

		if (direction !== 0) {
			this.setAnimation(running ? 'run' : 'walk');
		} else {
			this.setAnimation('idle');
		}

		this.advanceFrame(deltaMs);
		this.applyFrame();
	};

	private clampPosition(): void {
		if (!this.app) return;
		const margin = 40;
		const max = this.app.renderer.width - margin;
		this.positionX = Math.min(Math.max(this.positionX, margin), max);
	}

	private advanceFrame(deltaMs: number): void {
		const frames = this.animations[this.currentName];
		if (!frames || frames.length < 2) return;

		this.frameElapsed += deltaMs;
		let guard = frames.length;
		while (this.frameElapsed >= frames[this.frameIndex].duration && guard-- > 0) {
			this.frameElapsed -= frames[this.frameIndex].duration;
			this.frameIndex = (this.frameIndex + 1) % frames.length;
		}
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		const direction = KEY_DIRECTION[event.key];
		if (direction === undefined) return;
		event.preventDefault();

		// event.repeat is the OS key-repeat while held — ignore it so it can't be
		// mistaken for a genuine second tap.
		if (!event.repeat) {
			const now = performance.now();
			if (now - this.lastTapTime[event.key] <= this.options.doubleTapMs) {
				this.runningDirection = direction;
			}
			this.lastTapTime[event.key] = now;
		}

		this.held.add(event.key);
	};

	private onKeyUp = (event: KeyboardEvent): void => {
		this.held.delete(event.key);
		// Releasing the run direction ends the run (a fresh double-tap restarts it).
		if (KEY_DIRECTION[event.key] === this.runningDirection) {
			this.runningDirection = 0;
		}
	};
}
