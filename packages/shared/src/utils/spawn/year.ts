/**
 * Formats a spawn's date as a two-digit apostrophe year suffix (2025 → `'25`), or
 * null when the input is missing or unparseable. Shared by the character card and
 * the booster pack so both render the spawn year identically.
 */
export function spawnYearLabel(spawnedAt: string | number | Date | null | undefined): string | null {
	if (spawnedAt == null) return null;
	const year = new Date(spawnedAt).getFullYear();
	if (Number.isNaN(year)) return null;
	return `'${String(year).slice(-2).padStart(2, '0')}`;
}
