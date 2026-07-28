/**
 * A span of milliseconds as a clock readout, `H:MM:SS` — what a countdown to one
 * of the game's daily resets shows. Hours are never padded (they run to 24 at
 * most) and never dropped, so the string keeps its shape as it ticks down.
 * Negative spans read as zero: a deadline that has passed has nothing left.
 */
export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	const pad = (value: number): string => String(value).padStart(2, '0');
	return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}
