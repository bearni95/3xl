import { get, writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import localStorageWritableStore from '$utils/localStorageWritableStore';
import { musicTrackSrc } from '$utils/music/tracks';
import {
	dailyShowShuffles,
	utcDayIso,
	utcMidnightMs,
	type ShowShuffle
} from '$utils/music/daily-shuffle';
import { stationPositionAt } from '$utils/music/station';
import type { MusicTrack, MusicCollection } from '$types/music.type';

/**
 * The radio. There is a single player in the corner of the map, so there is a single
 * audio element, and it lives here rather than in the component: a component is
 * mounted and unmounted, and a song that stopped because a panel closed would be the
 * page deciding something about the music. The element is the service's, created once,
 * and it keeps playing whatever happens on screen.
 *
 * What there is to play is not in here either: the songs are vendored in @3xl/assets
 * and what each of them is — its title, and the show it opens — is the authored
 * `public/music.json`, read here at `/data/music.json`, the same way the badges and
 * the shows are read.
 *
 * **A show is a station**, and a station is not a playlist. Its songs are put in an
 * order drawn from the day's seed (`daily-shuffle`), they run end to end from the
 * day's midnight UTC and start again when they run out, and what is playing at any
 * moment is whichever song that clock lands in — at the second the clock lands on
 * (`station`). Nothing here chooses a song and nothing is stored or sent: two players
 * pressing play at the same instant hear the same bar of the same song, and one who
 * pauses for ten minutes comes back to what the station played on without them. All
 * a listener chooses is which station they are on.
 *
 * The lengths that clock is built out of are the files' and nobody authors them, so
 * they are read off the audio itself, one probe per song, before a station can be
 * placed. Until they land — and for a file that will not decode — the station falls
 * back to being a playlist in the day's order, which is the closest thing to a radio
 * that can be had without knowing when anything ends.
 *
 * Two things about a radio belong to the listener rather than to the clock, and both
 * are remembered in localStorage across a reload: which station they are on, and
 * whether they had it on at all. Neither is a position — there is nothing to resume,
 * because the station kept playing while the page was gone — so what is restored is a
 * station tuned in where it now is, and a play the browser is asked for twice. Once on
 * the spot, which it may refuse, since a reload is not a gesture and an autoplay policy
 * is not something to argue with; and then at the listener's first click or key on the
 * page, whatever that press was actually for, which is a gesture and is allowed. So a
 * radio left on comes back on, at the moment the listener touches anything — and until
 * they do, the plate honestly says Play. A refusal is never written back as their having
 * turned it off, because they did not.
 *
 * The store says only what a surface has to draw: which song is on, whether it is
 * running, and the stations there are to choose between.
 */

/** Metadata is loaded, so `currentTime` can be set — `HTMLMediaElement.HAVE_METADATA`. */
const HAVE_METADATA = 1;

/**
 * How far off the station's clock the running song may be before it is seeked back.
 * A seek is audible, so it is not worth doing for the tenths a decode costs; a second
 * and a half is under a bar and well inside what two listeners would call the same
 * moment.
 */
const DRIFT_MS = 1500;

/**
 * Added to the wait for the next song, so the retune lands just *after* the boundary
 * rather than on it — a timer that fires a millisecond early would place the station
 * on the song that is ending and immediately have to come back.
 */
const RETUNE_MARGIN_MS = 50;

/** Where the listener's two choices are kept between visits. */
const MEMORY_KEY = 'music-player';

/** What a surface needs to letter the player. */
export interface MusicState {
	/**
	 * The song on air, or null before the collection has been read and for a game whose
	 * collection is empty — there is then nothing to draw a player for.
	 */
	track: MusicTrack | null;
	/** Whether it is actually running — read off the element, not off the last order. */
	playing: boolean;
	/**
	 * Every station there is to choose between, as show ids in dial order — the shows
	 * that have a song, by id, and `null` last for the songs that open no show. Empty
	 * until the collection has been read.
	 */
	stations: (number | null)[];
	/**
	 * Which of them is tuned. The station actually playing, not the remembered choice:
	 * a listener whose station has lost its last song is on the first one, and this
	 * says so. Meaningless while {@link stations} is empty, where nothing is drawn.
	 */
	station: number | null;
}

/** The listener's own two choices, kept in localStorage across a reload. */
interface MusicMemory {
	/**
	 * The station last chosen — a show id, `null` for the songs that open no show, and
	 * absent for a listener who has never chosen one, which is not the same as having
	 * chosen the unlinked songs.
	 */
	station?: number | null;
	/** Whether the radio was left on. */
	on: boolean;
}

class MusicService {
	/** Lazily built, browser-only: `new Audio()` does not exist while prerendering. */
	private audio: HTMLAudioElement | null = null;

	/** Which file the element carries, so a seek meant for one song cannot land in another. */
	private loadedFile: string | null = null;

	/** The authored collection, in file order. Empty until {@link load} resolves. */
	private tracks: readonly MusicTrack[] = [];

	/** The UTC day {@link stations} was drawn for. Empty until the first grouping. */
	private day = '';

	/** Every station's day order. Redrawn when the day turns over, and only then. */
	private stations: ShowShuffle[] = [];

	/**
	 * The tuned station's show, `null` for the songs that open no show, and
	 * `undefined` for a listener who has not chosen one: that is not a station's key,
	 * so it falls through to the first one. Seeded from the last visit's choice.
	 */
	private tuned: number | null | undefined = undefined;

	/** Where in the tuned station's order the element is. The store mirrors it. */
	private index = 0;

	/** How long each song is, in seconds, by file — read off the audio, never authored. */
	private readonly durations = new Map<string, number>();

	/**
	 * Each file's probe, by file — the promise and not a flag, so a station tuned into
	 * while its songs are still being measured waits for those probes rather than
	 * concluding from "already asked" that the answer is in.
	 */
	private readonly probes = new Map<string, Promise<void>>();

	/** The pending retune at the end of the song on air. */
	private retuneAt: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Whether the listener wants sound. The element is only where it comes out — a
	 * station changing song pauses the element on its way past, and that is not the
	 * listener turning the radio off.
	 */
	private wanted = false;

	/** The in-flight (or finished) read, so several mounts share one fetch. */
	private reading: Promise<void> | null = null;

	/**
	 * Whether the remembered "on" has been acted on. Once only, and on the first
	 * station that can be placed: a reload that turned the radio back on and then kept
	 * turning it back on would be a play button that could not be pressed off.
	 */
	private resumed = false;

	/**
	 * How to stand down the wait for the listener's first gesture, or null when nothing
	 * is waiting on one. Holding the disarm rather than a flag is what keeps the
	 * listeners from outliving what they were for (see {@link awaitGesture}).
	 */
	private awaiting: (() => void) | null = null;

	/**
	 * The listener's two choices, written only where they make one — never from a
	 * refused autoplay or from anything the clock did.
	 */
	private readonly memory = localStorageWritableStore<MusicMemory>(MEMORY_KEY, { on: false });

	private readonly stateStore = writable<MusicState>({
		track: null,
		playing: false,
		stations: [],
		station: null
	});

	constructor() {
		// The station chosen last time, before anything is read: the collection may not
		// still hold it, and a key naming no station falls through to the first.
		this.tuned = get(this.memory).station;
	}

	/** What is on air and whether it is running, for a surface to subscribe to. */
	get state(): Readable<MusicState> {
		return this.stateStore;
	}

	/**
	 * Read the collection once and tune in, paused. Safe to call from every mount: the
	 * first call fetches and the rest await that same promise. A failed read leaves the
	 * player with no song — and so undrawn — rather than with a button that would play
	 * nothing; it is cleared, so a later mount tries again.
	 */
	load(): Promise<void> {
		this.reading ??= fetch('/data/music.json')
			.then((response) => {
				if (!response.ok) throw new Error(`Failed to load music (${response.status})`);
				return response.json() as Promise<MusicCollection>;
			})
			.then((collection) => {
				this.tracks = collection.tracks ?? [];
				// Force the regroup: a station() call before the fetch landed will have
				// grouped an empty collection under today's date.
				this.day = '';
				this.index = 0;
				// Nothing has been measured yet, so this is the day's order from its start.
				// It is what the plate letters while the probes are out, and it is replaced
				// by whatever is really on air the moment they are all in.
				this.tune();
				this.measure(this.station());
			})
			.catch((error) => {
				this.reading = null;
				throw error;
			});
		return this.reading;
	}

	/**
	 * Turn the radio on, or off if it is already on. The only entry point that may
	 * start sound, so it must be reached from a real click: browsers refuse a `play()`
	 * that no gesture asked for. Turning it on tunes in first — a radio that had been
	 * off for a while is not resumed where it stopped, it is joined where it now is.
	 */
	toggle(): void {
		const audio = this.element();
		if (!audio) return;

		// Wanted but not running is a radio something else stopped — the OS media keys,
		// a tab that was suspended. That click is asking for it back, not for silence.
		if (this.wanted && !audio.paused) {
			this.wanted = false;
			this.remember({ on: false });
			audio.pause();
			return;
		}
		this.wanted = true;
		this.remember({ on: true });
		this.tune();
	}

	/**
	 * Tune to a station by the show it is: an id from {@link MusicState.stations}, or
	 * `null` for the songs that open no show. The radio stays on or off as it was, and
	 * the new station is joined where it now is — there is no starting one from the
	 * top. A show the collection has no station for is not tuned to.
	 */
	tuneTo(showId: number | null): void {
		const current = this.station();
		if (!current || current.showId === showId) return;
		if (!this.stations.some((station) => station.showId === showId)) return;

		this.tuned = showId;
		this.index = 0;
		this.remember({ station: showId });
		this.tune();
		this.measure(this.station());
	}

	/**
	 * Put the element on whatever the tuned station is playing at this instant, and
	 * arrange to come back when that song ends. Called on every boundary whether or not
	 * anyone is listening, so the plate says what is on air rather than what was on air
	 * when the listener last paused.
	 */
	private tune(ended = false): void {
		if (this.retuneAt !== null) {
			clearTimeout(this.retuneAt);
			this.retuneAt = null;
		}

		const station = this.station();
		const order = station?.tracks ?? [];
		if (order.length === 0) return;

		const position = stationPositionAt(
			order,
			this.durations,
			Date.now() - utcMidnightMs(this.day)
		);

		if (!position) {
			// Not placeable: a length is still on its way, or a file will not decode. The
			// order still plays, from wherever it has got to — the same songs in the same
			// order as everyone else's, only not at the same second. The tune that follows
			// the last probe puts it back on air.
			//
			// With no clock to place it, the only thing that moves this station along is a
			// song running out — which is the one moment `ended` is the truth about, so it
			// is the one place the next song is chosen here rather than read off a clock.
			const at = Math.min(this.index, order.length - 1);
			this.air(order, ended ? (at + 1) % order.length : at, 0);
			return;
		}

		this.air(order, position.index, position.offsetMs);
		this.retuneAt = setTimeout(() => this.tune(), position.remainingMs + RETUNE_MARGIN_MS);
	}

	/** Letter one song as being on, and put the element on it at `offsetMs` into it. */
	private air(order: readonly MusicTrack[], index: number, offsetMs: number): void {
		this.index = index;
		const track = order[index];
		this.stateStore.update((state) => ({ ...state, track }));

		const audio = this.audio;
		// Nobody has pressed play yet: there is no element to put anywhere, and the plate
		// above is all there is to keep up to date.
		if (!audio) return;

		if (this.loadedFile !== track.file) {
			this.loadedFile = track.file;
			audio.src = musicTrackSrc(track.file);
			this.seek(audio, track.file, offsetMs);
		} else if (Math.abs(audio.currentTime * 1000 - offsetMs) > DRIFT_MS) {
			// The right song but the wrong moment of it — a tab that was suspended, or a
			// decode that fell behind. Anything smaller than the drift is left alone: a
			// seek is audible and being a second out is not.
			this.seek(audio, track.file, offsetMs);
		}

		if (this.wanted) void this.start(audio);
	}

	/**
	 * Move `audio` to `offsetMs` into `file`, waiting for the metadata if it is not in
	 * yet — `currentTime` cannot be set on an element that does not know how long it
	 * is. A seek that arrives after the station has moved on is dropped rather than
	 * landing in whatever song is loaded by then.
	 */
	private seek(audio: HTMLAudioElement, file: string, offsetMs: number): void {
		if (audio.readyState >= HAVE_METADATA) {
			audio.currentTime = offsetMs / 1000;
			return;
		}
		audio.addEventListener(
			'loadedmetadata',
			() => {
				if (this.loadedFile === file) audio.currentTime = offsetMs / 1000;
			},
			{ once: true }
		);
	}

	/**
	 * The tuned station, regrouping the collection if the day has turned over since it
	 * was last asked — the orders are the day's, and the map is a page that can be left
	 * open across a midnight. What is tuned is carried across by show, not by position:
	 * a new day reorders each station's songs, not the stations.
	 */
	private station(): ShowShuffle | null {
		const day = utcDayIso();
		const regrouped = day !== this.day;
		if (regrouped) {
			this.day = day;
			this.stations = dailyShowShuffles(this.tracks, day);
		}
		if (this.stations.length === 0) return null;

		const tuned =
			this.stations.find((station) => station.showId === this.tuned) ?? this.stations[0];
		// The dial as a surface draws it, published from the one place that works out
		// which station is really on — and only when it has moved, since this is asked
		// again at every song boundary and a store set is a redraw.
		this.stateStore.update((state) =>
			!regrouped && state.station === tuned.showId
				? state
				: {
						...state,
						station: tuned.showId,
						stations: this.stations.map((station) => station.showId)
					}
		);
		return tuned;
	}

	/** Write down one of the listener's two choices, for the next time they are here. */
	private remember(choice: Partial<MusicMemory>): void {
		this.memory.update((memory) => ({ ...memory, ...choice }));
	}

	/**
	 * Turn the radio back on if that is how it was left, once there is a station to
	 * turn it on to. A reload is not a gesture, so the browser may refuse — that is
	 * reported as not playing and is not written down as the listener having turned it
	 * off, since they did not. What is asked for instead is the listener's next
	 * gesture, whatever it turns out to be (see {@link awaitGesture}): the policy is
	 * about gestures and not about this radio, so the first one there is will do.
	 */
	private resume(): void {
		if (this.resumed) return;
		this.resumed = true;
		if (!get(this.memory).on || !this.element()) return;
		this.wanted = true;
		this.tune();
		this.awaitGesture();
	}

	/**
	 * Turn the radio on at the listener's first gesture on the page — armed when a
	 * remembered "on" is restored, and the whole of what makes that memory worth
	 * keeping: an autoplay policy refuses a play that no gesture asked for, so a radio
	 * left on came back silent every time and the setting was a note nobody could act
	 * on. Any gesture carries the permission; it does not have to be about the music.
	 *
	 * Armed whether or not the restore was refused, because at that moment nobody knows
	 * yet — `play()` answers a turn later. A radio that is already on simply disarms
	 * this at the first click without doing anything.
	 *
	 * `click` and `keyup` and not the presses under them: they are the *end* of an
	 * interaction, by which time whatever the listener was pressing has already been
	 * handled. That matters because the first click of a visit is quite likely to be on
	 * the play button itself — and a radio turned on underneath that press would be
	 * turned off again by the press, which would read as a play button that does not
	 * work. For the same reason the decision is taken a task later than the event, so a
	 * keyboard press whose click comes after the keyup is handled before it: whatever
	 * that gesture did to the radio has happened by then, and this stands down if the
	 * radio is already on. A gesture's permission outlives the task it arrived in, so
	 * playing from there is still playing from a gesture.
	 *
	 * A pan or a wheel over the map is not one of these, and deliberately: neither
	 * counts as a gesture for the policy either, so a play from one would be refused —
	 * the listener has to have touched something.
	 */
	private awaitGesture(): void {
		if (!browser || this.awaiting) return;

		const act = () => {
			// The gesture may have been the listener turning the radio on themselves, or
			// they may have turned it off since the page loaded. Only a radio still
			// remembered as on, and not already on, is started here.
			if (!get(this.memory).on || this.wanted) return;
			this.wanted = true;
			this.tune();
		};

		const onGesture = () => {
			this.awaiting?.();
			setTimeout(act, 0);
		};

		const events = ['click', 'keyup'] as const;
		for (const event of events) window.addEventListener(event, onGesture, { passive: true });
		this.awaiting = () => {
			this.awaiting = null;
			for (const event of events) window.removeEventListener(event, onGesture);
		};
	}

	/**
	 * Read the length of every song in `station` that has not been read yet, then tune,
	 * since knowing them is what turns its order into a time of day. A file that will
	 * not decode is left unmeasured rather than recorded as zero — the truth about it
	 * is that the station cannot be placed, which is what the fallback above is for.
	 *
	 * The other stations are measured after it, so turning the dial is on air at once
	 * rather than stumbling through the same wait; they wait their turn so that they
	 * cannot delay the station somebody is actually listening to.
	 */
	private measure(station: ShowShuffle | null): void {
		if (!browser || !station) return;
		const showId = station.showId;
		void Promise.all(station.tracks.map((track) => this.probe(track.file))).then(() => {
			// The dial may have moved while the probes were out; that station's own
			// measure() will tune when it is ready.
			if (this.station()?.showId !== showId) return;
			this.tune();
			// The first station that can be placed is where a remembered "on" is acted
			// on: turning it back on before that would put the listener into the
			// fallback's first song and then jump them out of it a second later.
			this.resume();
			return Promise.all(
				this.stations
					.filter((other) => other.showId !== showId)
					.flatMap((other) => other.tracks.map((track) => this.probe(track.file)))
			);
		});
	}

	/**
	 * How long one song is, asked of an audio element that loads metadata and nothing
	 * else. Kept for as long as the page is open: a song is not a different length
	 * tomorrow. Resolves either way — a file that will not answer is one the station
	 * cannot be placed against, not an error anybody can act on.
	 */
	private probe(file: string): Promise<void> {
		const asked = this.probes.get(file);
		if (asked) return asked;

		const answer = new Promise<void>((resolve) => {
			const probe = new Audio();
			probe.preload = 'metadata';
			probe.addEventListener('loadedmetadata', () => {
				this.durations.set(file, probe.duration);
				resolve();
			});
			probe.addEventListener('error', () => resolve());
			probe.src = musicTrackSrc(file);
		});
		this.probes.set(file, answer);
		return answer;
	}

	/**
	 * `play()` and what to do when it is refused. A rejected play is the browser's
	 * autoplay policy or a file that would not decode; either way nothing is running,
	 * and the element's own `pause` event has not fired, so the flag is set here — and
	 * the radio is not left thinking it is on when it is not.
	 */
	private async start(audio: HTMLAudioElement): Promise<void> {
		try {
			await audio.play();
		} catch {
			this.wanted = false;
			this.stateStore.update((state) => ({ ...state, playing: false }));
		}
	}

	/**
	 * The audio element, built on first use with the song that is on air. Null on the
	 * server and before there is anything to play, which is what makes every method
	 * above safe to call from anywhere.
	 *
	 * `playing` is kept from the element's own events rather than from the call that
	 * asked, so anything that stops it without going through this service — the OS
	 * media keys, the tab being suspended — is still reflected in what the button
	 * shows. A song that runs out is not the end of anything: the station is asked
	 * again, and the answer is the next song at the top of it.
	 */
	private element(): HTMLAudioElement | null {
		if (!browser) return null;
		if (this.audio) return this.audio;
		const track = this.station()?.tracks[this.index];
		if (!track) return null;

		const audio = new Audio(musicTrackSrc(track.file));
		audio.preload = 'metadata';
		this.loadedFile = track.file;
		audio.addEventListener('play', () =>
			this.stateStore.update((state) => ({ ...state, playing: true }))
		);
		audio.addEventListener('pause', () =>
			this.stateStore.update((state) => ({ ...state, playing: false }))
		);
		audio.addEventListener('ended', () => this.tune(true));
		this.audio = audio;
		return audio;
	}
}

export const musicService = new MusicService();
