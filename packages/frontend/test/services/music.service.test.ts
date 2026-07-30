import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { MusicCollection, MusicTrack } from '$types/music.type';
import { dailyShowShuffles, utcDayIso, utcMidnightMs } from '$utils/music/daily-shuffle';

/**
 * The radio itself: the service that turns a day's order plus the songs' lengths into
 * a time of day, and puts the audio element on whatever that says.
 *
 * The arithmetic is pinned in `music-station.test.ts`; what is asserted here is the
 * wiring — that the clock and not a playlist cursor decides what is on, that pressing
 * play joins a song part-way through rather than starting it, that a station moves on
 * by itself, and that the dial changes station without touching either one's clock.
 *
 * So the two things the browser supplies are supplied here: a fetch that answers with
 * a collection, and an audio element that reports how long a file is. The lengths are
 * round numbers, which is what lets every expectation below be worked out by hand.
 */

/** Lengths in seconds, by file — what the fake element reports for each. */
const LENGTHS = new Map<string, number>([
	['a-one.mp3', 60],
	['a-two.mp3', 60],
	['a-three.mp3', 60],
	['a-four.mp3', 60],
	['b-one.mp3', 30],
	['b-two.mp3', 30]
]);

const COLLECTION: MusicCollection = {
	tracks: [
		{ file: 'a-one.mp3', title: 'A one', showId: 11 },
		{ file: 'a-two.mp3', title: 'A two', showId: 11 },
		{ file: 'a-three.mp3', title: 'A three', showId: 11 },
		{ file: 'a-four.mp3', title: 'A four', showId: 11 },
		{ file: 'b-one.mp3', title: 'B one', showId: 22 },
		{ file: 'b-two.mp3', title: 'B two', showId: 22 }
	]
};

/** Station 11 runs four minutes end to end, station 22 one. */
const A_CYCLE_MS = 240_000;

/** A fixed instant, two and a half minutes into a UTC day. */
const DAY = '2026-07-30';
const CLOCK = utcMidnightMs(DAY) + 150_000;

/**
 * The audio element, as far as this service uses one: a src that answers with a
 * length, a play/pause that says so, and the two events the service keeps `playing`
 * from. Nothing decodes and nothing is heard — the assertions are about where the
 * element was pointed and what second of it was asked for.
 */
class FakeAudio {
	static instances: FakeAudio[] = [];

	/** Files whose metadata takes five seconds to come back. */
	static slow = new Set<string>();

	/** Whether `play()` is refused, as a browser refuses one no gesture asked for. */
	static refuse = false;

	preload = '';
	currentTime = 0;
	paused = true;
	readyState = 0;
	duration = NaN;

	private source = '';
	private handlers = new Map<string, Set<() => void>>();

	constructor(src?: string) {
		FakeAudio.instances.push(this);
		if (src) this.src = src;
	}

	get src(): string {
		return this.source;
	}

	/** As the load algorithm does: everything about the last file is dropped, and the
	 *  new one's metadata arrives a turn later — which is what makes `seek` wait. */
	set src(value: string) {
		this.source = value;
		this.readyState = 0;
		this.currentTime = 0;
		this.duration = NaN;
		const file = value.split('/').pop() ?? '';
		const answer = () => {
			if (this.source !== value) return;
			const seconds = LENGTHS.get(file);
			if (seconds === undefined) {
				this.emit('error');
				return;
			}
			this.duration = seconds;
			this.readyState = 1;
			this.emit('loadedmetadata');
		};
		// A file listed as slow answers seconds later, which is what a request over a
		// real connection does and what lets a test turn the dial mid-measure.
		if (FakeAudio.slow.has(file)) setTimeout(answer, 5_000);
		else queueMicrotask(answer);
	}

	/** The file the element carries, which is all a test wants to say about its src. */
	get file(): string {
		return this.source.split('/').pop() ?? '';
	}

	addEventListener(type: string, handler: () => void, options?: { once?: boolean }): void {
		const wrapped = options?.once
			? () => {
					this.removeEventListener(type, wrapped);
					handler();
				}
			: handler;
		const set = this.handlers.get(type) ?? new Set();
		set.add(wrapped);
		this.handlers.set(type, set);
	}

	removeEventListener(type: string, handler: () => void): void {
		this.handlers.get(type)?.delete(handler);
	}

	play(): Promise<void> {
		if (FakeAudio.refuse) return Promise.reject(new Error('NotAllowedError'));
		this.paused = false;
		this.emit('play');
		return Promise.resolve();
	}

	pause(): void {
		this.paused = true;
		this.emit('pause');
	}

	/** The song running out, which no fake clock can bring about on its own. */
	end(): void {
		this.paused = true;
		this.emit('ended');
	}

	private emit(type: string): void {
		for (const handler of [...(this.handlers.get(type) ?? [])]) handler();
	}
}

/** The element the service plays through: the one it built for itself, not a probe. */
function player(): FakeAudio {
	return FakeAudio.instances[FakeAudio.instances.length - 1];
}

/**
 * Let every probe answer and every retune land. A retune is scheduled just *after* the
 * song boundary it is for, so a wait is nudged past it — a test that stopped on the
 * boundary would be asking what is on air a moment before the changeover.
 */
async function settle(ms = 0): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms === 0 ? 0 : ms + 100);
	await vi.advanceTimersByTimeAsync(0);
}

/** The day's order for one station, which the service and this test draw alike. */
function order(showId: number): MusicTrack[] {
	const station = dailyShowShuffles(COLLECTION.tracks, utcDayIso(new Date(CLOCK))).find(
		(shuffle) => shuffle.showId === showId
	);
	return station?.tracks ?? [];
}

type MusicService = typeof import('$services/music.service').musicService;

/** A service that has read the collection and measured every song, at `CLOCK`. */
async function tunedIn(): Promise<MusicService> {
	vi.resetModules();
	const { musicService } = await import('$services/music.service');
	await musicService.load();
	await settle();
	return musicService;
}

describe('the radio', () => {
	beforeEach(() => {
		FakeAudio.instances = [];
		FakeAudio.slow = new Set();
		FakeAudio.refuse = false;
		vi.useFakeTimers({ now: CLOCK });
		vi.stubGlobal('Audio', FakeAudio);
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve({ ok: true, json: async () => COLLECTION }))
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('is on the song the time of day has got to, before anyone presses play', async () => {
		const service = await tunedIn();
		// Four songs of a minute each: two and a half minutes into the day is the third
		// of them, thirty seconds in. Nothing was played to get there and nothing was
		// stored — the clock is the whole of it.
		expect(get(service.state).track).toEqual(order(11)[2]);
	});

	it('joins the song part-way through rather than starting it', async () => {
		const service = await tunedIn();
		service.toggle();
		await settle();

		expect(player().file).toBe(order(11)[2].file);
		expect(player().currentTime).toBe(30);
		expect(get(service.state).playing).toBe(true);
	});

	it('moves on to the next song by itself when this one ends', async () => {
		const service = await tunedIn();
		service.toggle();
		await settle();

		await settle(30_000);
		expect(get(service.state).track).toEqual(order(11)[3]);
		expect(player().file).toBe(order(11)[3].file);
		// The top of it, give or take the nudge past the boundary: the station handed it
		// over, so there is nothing to skip past.
		expect(player().currentTime).toBeLessThan(0.5);
		expect(get(service.state).playing).toBe(true);
	});

	it('comes round to the top of the order and keeps going', async () => {
		const service = await tunedIn();
		service.toggle();
		await settle();

		// Ninety seconds on is the end of the fourth song and the start of the day's
		// order again — a station is minutes long and a day is not.
		await settle(90_000);
		expect(get(service.state).track).toEqual(order(11)[0]);
	});

	it('carries on without the listener, and is rejoined where it now is', async () => {
		const service = await tunedIn();
		service.toggle();
		await settle();
		service.toggle();
		expect(get(service.state).playing).toBe(false);

		// Silent for two songs. The station is not: turning it back on is joining what it
		// played without them, not resuming where they left off.
		await settle(120_000);
		service.toggle();
		await settle();
		// Four and a half minutes into the day is thirty seconds into the second time
		// round the order — the first song again, half a minute in.
		expect(get(service.state).track).toEqual(order(11)[0]);
		expect(player().currentTime).toBeCloseTo(30, 0);
	});

	it('keeps up with what is on air while it is off', async () => {
		// The plate says what the station is playing whether or not anyone is listening,
		// which is what makes pressing play give you the song it was lettering.
		const service = await tunedIn();
		await settle(30_000);
		expect(get(service.state).track).toEqual(order(11)[3]);
	});

	it('offers a station per show, and tunes to the one asked for', async () => {
		const service = await tunedIn();
		// The dial as a surface draws it: the shows that have a song, by id, and the
		// songs that open no show last. This collection makes two.
		expect(get(service.state).stations).toEqual([11, 22]);
		expect(get(service.state).station).toBe(11);

		service.tuneTo(22);
		await settle();
		// Station 22 is two songs of thirty seconds, so its minute-long order has come
		// round twice by the same instant, and it is at the top of its second song.
		expect(get(service.state).track).toEqual(order(22)[1]);
		expect(get(service.state).station).toBe(22);

		// And back: the first station is where its own clock has got to in the meantime,
		// not where it was left.
		service.tuneTo(11);
		await settle();
		expect(get(service.state).track).toEqual(order(11)[2]);
	});

	it('does not tune to a show there is no station for', async () => {
		const service = await tunedIn();
		service.tuneTo(999);
		await settle();
		expect(get(service.state).station).toBe(11);
		expect(get(service.state).track).toEqual(order(11)[2]);
	});

	it('waits for the lengths of a station turned to while they were still coming', async () => {
		// The second station's songs are still being measured in the background when the
		// dial reaches them. Having *asked* for a length is not having one, so the turn
		// waits for those same probes rather than placing the station against what is
		// known so far — which would have dropped it to the top of its order.
		FakeAudio.slow = new Set(['b-one.mp3', 'b-two.mp3']);
		const service = await tunedIn();

		service.tuneTo(22);
		await settle(5_000);
		expect(get(service.state).track).toEqual(order(22)[1]);
	});

	it('remembers the station and the play across a reload', async () => {
		const first = await tunedIn();
		first.tuneTo(22);
		first.toggle();
		await settle();
		expect(get(first.state).playing).toBe(true);

		// A reload: the module is thrown away and read back from nothing but
		// localStorage. The station is the one that was chosen, and the radio is on
		// again — but joined where that station now is, not where it was left, since it
		// never stopped.
		const reloaded = await tunedIn();
		await settle(30_000);
		expect(get(reloaded.state).station).toBe(22);
		expect(get(reloaded.state).playing).toBe(true);
		// Half a minute on, that station's minute-long order has come round to its top —
		// it kept running while the page was gone and while it was being read back.
		expect(get(reloaded.state).track).toEqual(order(22)[0]);
	});

	it('comes back off if that is how it was left', async () => {
		const first = await tunedIn();
		first.toggle();
		await settle();
		first.toggle();
		expect(get(first.state).playing).toBe(false);

		const reloaded = await tunedIn();
		await settle();
		expect(get(reloaded.state).playing).toBe(false);
		// And the plate still says what the station is playing, which is the point of
		// its being off rather than silent.
		expect(get(reloaded.state).track).toEqual(order(11)[2]);
	});

	it('is off on a first visit, and does not turn itself on', async () => {
		const service = await tunedIn();
		await settle(60_000);
		expect(get(service.state).playing).toBe(false);
	});

	it('keeps the remembered play through an autoplay the browser refuses', async () => {
		const first = await tunedIn();
		first.toggle();
		await settle();

		// A reload where nothing may play without a gesture. The radio reads as off,
		// because it is — but the listener never turned it off, so the setting stands:
		// the visit after this one tries again.
		FakeAudio.refuse = true;
		const refused = await tunedIn();
		await settle();
		expect(get(refused.state).playing).toBe(false);

		FakeAudio.refuse = false;
		const allowed = await tunedIn();
		await settle();
		expect(get(allowed.state).playing).toBe(true);
	});

	it('plays the day order from the top when a length never arrives', async () => {
		// A file that will not decode leaves the station unplaceable — every song after
		// an unknown length is at an unknown time. It still plays, in the day's order;
		// it just is not the same second as everyone else's.
		const missing = LENGTHS.get('a-three.mp3')!;
		LENGTHS.delete('a-three.mp3');
		try {
			const service = await tunedIn();
			expect(get(service.state).track).toEqual(order(11)[0]);
			service.toggle();
			await settle();
			expect(player().currentTime).toBe(0);

			// Nothing places this station, so the one thing that moves it on is a song
			// running out — and it does move on, rather than playing the same one again.
			player().end();
			await settle();
			expect(get(service.state).track).toEqual(order(11)[1]);
			expect(get(service.state).playing).toBe(true);
		} finally {
			LENGTHS.set('a-three.mp3', missing);
		}
	});

	it('redraws the order when the day turns over under it', async () => {
		const service = await tunedIn();
		service.toggle();
		await settle();

		// A map left open across midnight UTC: every station's order is redrawn from the
		// new day's seed, and the radio is on whatever that says rather than carrying the
		// old order into the new day.
		const toMidnight = utcMidnightMs('2026-07-31') - CLOCK;
		await settle(toMidnight + A_CYCLE_MS / 4);
		const tomorrow = dailyShowShuffles(COLLECTION.tracks, '2026-07-31').find(
			(shuffle) => shuffle.showId === 11
		)!;
		expect(get(service.state).track).toEqual(tomorrow.tracks[1]);
	});
});
