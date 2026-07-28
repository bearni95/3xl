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
