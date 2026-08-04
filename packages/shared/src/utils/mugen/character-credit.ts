/**
 * How a character's byline is read out.
 *
 * The credit in the registry is the archive's own `[Info] author` (or a sprite sheet's
 * sidecar), copied through the decoded manifest untouched — so it arrives in the MUGEN
 * community's own spelling: several people who worked on one character are joined with
 * `&`, and an archive that names nobody decodes to the literal `Unknown`.
 *
 * Neither of those is a line to put in front of a player, so this turns the first into a
 * list of names and the second into whatever the catalogue calls an uncredited character.
 */
export function formatCharacterCredit(author: string, unknownLabel: string): string {
	const names = author
		.split('&')
		.map((name) => name.trim())
		.filter(Boolean);

	if (!names.length || (names.length === 1 && names[0].toLowerCase() === 'unknown')) {
		return unknownLabel;
	}

	return names.join(', ');
}
