import { ObjectServiceClass } from '$services/classes/object-service.class';
import type { ID } from '$types/core.type';

/** A team always has exactly this many slots. */
export const TEAM_SIZE = 3;

/** One team slot: a chosen character (or empty) plus an optional custom name. */
export interface TeamMember {
	characterId: string | null;
	name: string;
}

/** The player's single team, persisted to localStorage. */
export interface Team {
	id: ID;
	members: TeamMember[];
}

function emptyMember(): TeamMember {
	return { characterId: null, name: '' };
}

function emptyTeam(): Team {
	return {
		id: 'player-team',
		members: Array.from({ length: TEAM_SIZE }, emptyMember)
	};
}

/**
 * Manages the player's team of {@link TEAM_SIZE} characters, each with an optional
 * name, persisted to localStorage via {@link ObjectServiceClass}. The team enforces
 * distinct characters: picking a character that already sits in another slot moves
 * it there, clearing the old slot.
 */
class TeamService extends ObjectServiceClass<Team> {
	constructor() {
		super('team', emptyTeam());
		this.normalize();
	}

	/** Guard against malformed / older persisted shapes losing the fixed slot count. */
	private normalize(): void {
		const team = this.get();
		if (!Array.isArray(team.members) || team.members.length !== TEAM_SIZE) {
			const members = Array.from(
				{ length: TEAM_SIZE },
				(_, index) => team.members?.[index] ?? emptyMember()
			);
			this.set({ ...team, members });
		}
	}

	/** Assign a character to a slot, clearing it from any other slot it occupied. */
	setMember(index: number, characterId: string | null): void {
		this.store.update((team) => ({
			...team,
			members: team.members.map((member, i) => {
				if (i === index) return { ...member, characterId };
				if (characterId && member.characterId === characterId) {
					return { ...member, characterId: null };
				}
				return member;
			})
		}));
	}

	/** Set a slot's optional custom name. */
	renameMember(index: number, name: string): void {
		this.store.update((team) => ({
			...team,
			members: team.members.map((member, i) => (i === index ? { ...member, name } : member))
		}));
	}

	/** Empty a slot (character and name). */
	clearMember(index: number): void {
		this.store.update((team) => ({
			...team,
			members: team.members.map((member, i) => (i === index ? emptyMember() : member))
		}));
	}
}

export const teamService = new TeamService();
