// The game's day boundary. Every daily rule in the game — the booster allowance,
// which towns are de festa, one challenge per town — resets at midnight in Catalan
// (Europe/Madrid) time, and the server enforces every one of them against that same
// zone. This is the client's copy of it, so what the UI counts as "today" matches
// what the RPCs will accept whatever timezone the device is in.

/** The zone every daily reset in the game is measured in. */
export const CATALAN_TIME_ZONE = 'Europe/Madrid';

/**
 * `at` as a `YYYY-MM-DD` date string in Catalan time (now by default) — the same
 * day the `claim_booster` / `start_challenge` RPCs would place it in. `en-CA`
 * formats a Gregorian date as `YYYY-MM-DD`.
 */
export function catalanDayIso(at: Date = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: CATALAN_TIME_ZONE }).format(at);
}

/** Reads an instant as Catalan wall-clock parts, for the offset below. */
const wallClockFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: CATALAN_TIME_ZONE,
	hourCycle: 'h23',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit'
});

/**
 * How far Catalan time ran ahead of UTC at `at`, in milliseconds — +1h in winter,
 * +2h under summer time. Derived by reading the zone's wall clock and taking it as
 * if it were UTC, so it needs no table of when the switches fall.
 */
function catalanOffsetMs(at: Date): number {
	const parts = wallClockFormat.formatToParts(at);
	const field = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((part) => part.type === type)?.value ?? 0);
	const asIfUtc = Date.UTC(
		field('year'),
		field('month') - 1,
		field('day'),
		field('hour'),
		field('minute'),
		field('second')
	);
	// The wall clock has no milliseconds, so compare against whole seconds; every
	// real offset is a whole number of minutes anyway.
	return asIfUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * The instant the Catalan day after `at` begins — when the booster allowance, the
 * festa list and every town's spent challenge reset. The offset is read twice
 * because the day the countdown ends in may be on the other side of a summer-time
 * switch from the day it started in, and so an hour longer or shorter.
 */
export function nextCatalanMidnight(at: Date = new Date()): Date {
	const [year, month, day] = catalanDayIso(at).split('-').map(Number);
	// Tomorrow's midnight as a wall clock (`Date.UTC` rolls day 32 into the next
	// month for us), which is a local time still owed its offset.
	const wallClock = Date.UTC(year, month - 1, day + 1);
	const provisional = wallClock - catalanOffsetMs(at);
	return new Date(wallClock - catalanOffsetMs(new Date(provisional)));
}

/** Milliseconds left of the Catalan day `at` falls in. */
export function msUntilCatalanMidnight(at: Date = new Date()): number {
	return nextCatalanMidnight(at).getTime() - at.getTime();
}
