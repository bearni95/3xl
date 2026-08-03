/**
 * A string as it should be *matched* rather than as it is read: lower-cased and stripped
 * of its diacritics, so `Sant Julià` is found by typing `sant julia`.
 *
 * Which is not a convenience — it is what searching in Catalan means. A reader typing a
 * town's name has an accent to place on nearly every other word (à, è, é, í, ò, ó, ú, ï,
 * ü, ç), and a match that insisted on them would be a search only for people who already
 * know how the place is spelled, which is the one group that does not need to search.
 *
 * NFD is what makes the strip possible: it decomposes each accented character into its
 * letter followed by a combining mark, which `\p{Diacritic}` then takes away. The result
 * is never shown — it exists to be compared against another string folded the same way,
 * so both sides of a comparison must go through here.
 *
 * Not `normalize()` in this same folder, which hyphenates for slugs and is a different
 * question entirely.
 */
export default function foldText(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}
