import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { musicTrackSrc } from '$utils/music/tracks';
import type { MusicTrack, MusicCollection } from '$types/music.type';

/**
 * The one thing playing. There is a single player in the corner of the map, so there
 * is a single audio element, and it lives here rather than in the component: a
 * component is mounted and unmounted, and a song that stopped because a panel closed
 * would be the page deciding something about the music. The element is the service's,
 * created once, and it keeps playing whatever happens on screen.
 *
 * What there is to play is not in here either: the songs are vendored in @3xl/assets
 * and what each of them is — its title, and the show it opens — is the authored
 * `public/music.json`, read here at `/data/music.json`, the same way the badges and
 * the shows are read. So adding a song to the game is dropping a file in and saying
 * something about it on the admin `/music` screen, and this plays whatever that turns
 * out to be, in the order the file lists.
 *
 * The store says only what a surface has to draw — which song is loaded and whether
 * it is running. Everything else (the element, the loading, the wrap at the end of
 * the collection) is in here.
 */

/** What a surface needs to letter the player. */
export interface MusicState {
	/**
	 * The loaded song, or null before the collection has been read and for a game
	 * whose collection is empty — there is then nothing to draw a player for.
	 */
	track: MusicTrack | null;
	/** Whether it is actually running — read off the element, not off the last order. */
	playing: boolean;
}

class MusicService {
	/** Lazily built, browser-only: `new Audio()` does not exist while prerendering. */
	private audio: HTMLAudioElement | null = null;

	/** The authored collection, in file order. Empty until {@link load} resolves. */
	private tracks: readonly MusicTrack[] = [];

	/** Which of {@link tracks} is loaded. The store mirrors it; this decides it. */
	private index = 0;

	/** The in-flight (or finished) read, so several mounts share one fetch. */
	private reading: Promise<void> | null = null;

	private readonly stateStore = writable<MusicState>({ track: null, playing: false });

	/** What is loaded and whether it is running, for a surface to subscribe to. */
	get state(): Readable<MusicState> {
		return this.stateStore;
	}

	/**
	 * Read the collection once and load the first song, paused. Safe to call from every
	 * mount: the first call fetches and the rest await that same promise. A failed read
	 * leaves the player with no song — and so undrawn — rather than with a button that
	 * would play nothing; it is cleared, so a later mount tries again.
	 */
	load(): Promise<void> {
		this.reading ??= fetch('/data/music.json')
			.then((response) => {
				if (!response.ok) throw new Error(`Failed to load music (${response.status})`);
				return response.json() as Promise<MusicCollection>;
			})
			.then((collection) => {
				this.tracks = collection.tracks ?? [];
				this.index = 0;
				this.stateStore.update((state) => ({ ...state, track: this.tracks[0] ?? null }));
			})
			.catch((error) => {
				this.reading = null;
				throw error;
			});
		return this.reading;
	}

	/**
	 * Play, or pause if it is already running. The only entry point that may start
	 * sound, so it must be reached from a real click: browsers refuse a `play()` that
	 * no gesture asked for, and a refusal is reported as not playing rather than thrown
	 * at the caller.
	 */
	async toggle(): Promise<void> {
		const audio = this.element();
		if (!audio) return;

		if (audio.paused) await this.start(audio);
		else audio.pause();
	}

	/**
	 * Load the next song in the collection, wrapping at the end, and keep the player's
	 * current state: switching while it is playing plays the next one, switching while
	 * it is paused loads it paused. With two songs this is the swap between them.
	 */
	async next(): Promise<void> {
		if (this.tracks.length === 0) return;
		await this.selectIndex((this.index + 1) % this.tracks.length);
	}

	/** Point the element at song `index` and carry playing/paused across the change. */
	private async selectIndex(index: number): Promise<void> {
		if (index === this.index) return;

		this.index = index;
		const track = this.tracks[index];
		this.stateStore.update((state) => ({ ...state, track }));

		const audio = this.audio;
		if (!audio) return;

		const wasPlaying = !audio.paused;
		audio.src = musicTrackSrc(track.file);
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
	 * The audio element, built on first use with the loaded song's file. Null on the
	 * server and before there is anything to play, which is what makes every method
	 * above safe to call from anywhere.
	 *
	 * `playing` is kept from the element's own events rather than from the call that
	 * asked, so anything that stops it without going through this service — the OS
	 * media keys, the tab being suspended — is still reflected in what the button
	 * shows. When a song ends the next one is loaded and played: the collection is a
	 * playlist, and it wraps, so the music does not run out.
	 */
	private element(): HTMLAudioElement | null {
		if (!browser) return null;
		if (this.audio) return this.audio;
		const track = this.tracks[this.index];
		if (!track) return null;

		const audio = new Audio(musicTrackSrc(track.file));
		audio.preload = 'metadata';
		audio.addEventListener('play', () =>
			this.stateStore.update((state) => ({ ...state, playing: true }))
		);
		audio.addEventListener('pause', () =>
			this.stateStore.update((state) => ({ ...state, playing: false }))
		);
		// An ended song has left the element paused, so `selectIndex` will not restart
		// it — the next one is started here instead.
		audio.addEventListener('ended', () => {
			void this.next().then(() => this.start(audio));
		});
		this.audio = audio;
		return audio;
	}
}

export const musicService = new MusicService();
