/**
 * A 32-bit FNV-1a hash of a string, as an unsigned integer. Deterministic and
 * stable across machines and reloads — suited to seeding stable pseudo-random
 * picks, e.g. choosing one item from an array for a given key.
 */
export function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}
