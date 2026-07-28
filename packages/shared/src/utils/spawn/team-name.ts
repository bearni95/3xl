// What a team is called in the UI.
//
// A team's own name is optional. An unnamed one is labelled after its LEAD — the
// first filled slot, the same member teamShowId reads — as its show plus its
// rolled colour ("One Piece Red"). Those are the two facts that identify a team in
// play: the show it fights for, and the colour its lead sets over the other slots
// (see teammateColors). A team with no lead yet has neither, so it falls back to
// UNNAMED_TEAM_LABEL until its first pick.

import capitalize from '../string/capitalize';

/** What an unnamed team with no lead reads as. */
export const UNNAMED_TEAM_LABEL = 'Empty team';

/** The lead's two naming facts: the show it belongs to and its rolled colour. */
export interface TeamNameLead {
	/** The lead's show, or null when it belongs to none. */
	showName: string | null;
	/** The lead's rolled spawn colour, lower-case as the enum stores it. */
	color: string | null;
}

/**
 * A team's display name: its own name when it has one, else its lead's show and
 * colour, else {@link UNNAMED_TEAM_LABEL}. A lead missing one of the two facts
 * simply contributes the other, so a show-less lead still reads as its colour.
 */
export function teamDisplayName(
	name: string | null | undefined,
	lead: TeamNameLead | null
): string {
	const given = name?.trim();
	if (given) return given;
	const parts = [lead?.showName?.trim(), capitalize(lead?.color)].filter(Boolean);
	return parts.length > 0 ? parts.join(' ') : UNNAMED_TEAM_LABEL;
}
