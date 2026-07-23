import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

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
}

export interface Manifest {
	name: string;
	author: string;
	/** Portrait sprite, or null when the character ships none in group 9000. */
	face: ManifestFace | null;
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
	/** Upward launch speed (px/s) applied at the moment of a jump. */
	jumpSpeed?: number;
	/** Downward acceleration (px/s²) pulling an airborne character back down. */
	gravity?: number;
	backgroundColor?: number;
}

const DEFAULTS = {
	basePath: '/kikyo/frames',
	scale: 2.5,
	speed: 90,
	runSpeed: 220,
	doubleTapMs: 260,
	jumpSpeed: 520,
	gravity: 1400,
	backgroundColor: 0x1d232a
};

/** Arrow keys mapped to a horizontal direction. */
const KEY_DIRECTION: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

/** Keys that trigger a jump from the ground. */
const JUMP_KEYS = new Set(['ArrowUp', ' ', 'Spacebar', 'w', 'W']);

// Only the movement animations the game loop drives. Manifests now carry a
// character's full moveset (100+ animations); loading them all here would pull
// hundreds of unused textures onto the play page, so we load just these.
const GAME_ANIMATIONS = new Set(['idle', 'walk', 'run', 'jump', 'fall']);

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

	// Vertical state. groundY is the baseline (feet on the ground line);
	// verticalOffset is how far above it the character currently is, and
	// velocityY is the upward speed (positive up, negative falling).
	private groundY = 0;
	private verticalOffset = 0;
	private velocityY = 0;
	private grounded = true;

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
		this.app = app;
		container.appendChild(app.canvas);

		const manifest = await this.loadAssets();

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
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.held.clear();
		if (this.app) {
			this.app.destroy(true, { children: true });
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
		this.sprite.y = this.groundY - this.verticalOffset;
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

		// Integrate the jump: gravity pulls velocity down until the feet reach
		// the ground line again, which lands the character.
		if (!this.grounded) {
			this.velocityY -= this.options.gravity * deltaSeconds;
			this.verticalOffset += this.velocityY * deltaSeconds;
			if (this.verticalOffset <= 0) {
				this.verticalOffset = 0;
				this.velocityY = 0;
				this.grounded = true;
			}
		}

		if (!this.grounded) {
			// Rising uses the jump pose, descending the fall pose (falling back to
			// the jump pose when a character has no dedicated fall animation).
			const airborne = this.velocityY > 0 ? 'jump' : 'fall';
			this.setAnimation(this.animations[airborne] ? airborne : 'jump');
		} else if (direction !== 0) {
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
		if (JUMP_KEYS.has(event.key)) {
			event.preventDefault();
			// Only launch from the ground, and ignore OS key-repeat so holding the
			// key doesn't re-trigger. Landing (grounded) re-arms the next jump.
			if (this.grounded && !event.repeat) {
				this.grounded = false;
				this.velocityY = this.options.jumpSpeed;
			}
			return;
		}

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
