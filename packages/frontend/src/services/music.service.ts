import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { MUSIC_TRACKS } from '$utils/music/tracks';
import type { MusicTrack } from '$types/music.type';

/**
 * The one thing playing. There is a single player in the corner of the map, so
 * there is a single audio element, and it lives here rather than in the component:
 * a component is mounted and unmounted, and a song that stopped because a panel
 * closed would be the page deciding something about the music. The element is the
 * service's, created once, and it keeps playing whatever happens on screen.
 *
 * The store says only what a surface has to draw — which track is loaded and
 * whether it is running. Everything else (the element, the loading, the wrap at the
 * end of the list) is in here.
 */

/** What a surface needs to letter the player. */
export interface MusicState {
	/** The loaded track. Never null: the list is not empty and one is always loaded. */
	track: MusicTrack;
	/** Whether it is actually running — read off the element, not off the last order. */
	playing: boolean;
}

class MusicService {
	/** Lazily built, browser-only: `new Audio()` does not exist while prerendering. */
	private audio: HTMLAudioElement | null = null;

	/** Which of {@link MUSIC_TRACKS} is loaded. The store mirrors it; this decides it. */
	private index = 0;

	private readonly stateStore = writable<MusicState>({ track: MUSIC_TRACKS[0], playing: false });

	/** What is loaded and whether it is running, for a surface to subscribe to. */
	get state(): Readable<MusicState> {
		return this.stateStore;
	}

	/**
	 * Play, or pause if it is already running. The only entry point that may start
	 * sound, so it must be reached from a real click: browsers refuse a `play()` that
	 * no gesture asked for, and a refusal is reported as not playing rather than
	 * thrown at the caller.
	 */
	async toggle(): Promise<void> {
		const audio = this.element();
		if (!audio) return;

		if (audio.paused) await this.start(audio);
		else audio.pause();
	}

	/**
	 * Load the next track in the list, wrapping at the end, and keep the player's
	 * current state: switching while it is playing plays the next one, switching while
	 * it is paused loads it paused. With two tracks this is the swap between them.
	 */
	async next(): Promise<void> {
		await this.load((this.index + 1) % MUSIC_TRACKS.length);
	}

	/** Point the element at track `index` and carry playing/paused across the change. */
	private async load(index: number): Promise<void> {
		if (index === this.index) return;

		this.index = index;
		const track = MUSIC_TRACKS[index];
		this.stateStore.update((state) => ({ ...state, track }));

		const audio = this.audio;
		if (!audio) return;

		const wasPlaying = !audio.paused;
		audio.src = track.src;
		if (wasPlaying) await this.start(audio);
	}

	/**
	 * `play()` and what to do when it is refused. A rejected play is the browser's
	 * autoplay policy or a file that would not decode; either way nothing is running,
	 * and the element's own `pause` event has not fired, so the flag is set here.
	 */
	private async start(audio: HTMLAudioElement): Promise<void> {
		try {
			await audio.play();
		} catch {
			this.stateStore.update((state) => ({ ...state, playing: false }));
		}
	}

	/**
	 * The audio element, built on first use with the loaded track's file. Null on the
	 * server, which is what makes every method above safe to call from anywhere.
	 *
	 * `playing` is kept from the element's own events rather than from the call that
	 * asked, so anything that stops it without going through this service — the OS
	 * media keys, the tab being suspended — is still reflected in what the button
	 * shows. When a track ends the next one is loaded and played: the list is a
	 * playlist, and it wraps, so the music does not run out.
	 */
	private element(): HTMLAudioElement | null {
		if (!browser) return null;
		if (this.audio) return this.audio;

		const audio = new Audio(MUSIC_TRACKS[this.index].src);
		audio.preload = 'metadata';
		audio.addEventListener('play', () =>
			this.stateStore.update((state) => ({ ...state, playing: true }))
		);
		audio.addEventListener('pause', () =>
			this.stateStore.update((state) => ({ ...state, playing: false }))
		);
		// An ended track has left the element paused, so `load` will not restart it —
		// the next one is started here instead.
		audio.addEventListener('ended', () => {
			void this.next().then(() => this.start(audio));
		});
		this.audio = audio;
		return audio;
	}
}

export const musicService = new MusicService();
