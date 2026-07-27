import { ObjectServiceClass } from '$services/classes/object-service.class';
import type { ID } from '$types/core.type';
import { COMBAT_TEAM_SIZE } from '$types/combat.type';

/**
 * A team always has exactly this many spawn slots — the side a fight fields, so
 * it is the shared combat constant the `award_combat_exp` RPC also caps reports at.
 */
export const TEAM_SIZE = COMBAT_TEAM_SIZE;

/**
 * A named team of {@link TEAM_SIZE} distinct spawns (empty slots allowed). Slots
 * hold **spawn ids**, not character ids — each claimed spawn is a unique entry, so
 * the same character claimed twice can occupy two different slots.
 */
export interface Team {
	id: string;
	/** Optional team name. */
	name: string;
	/** One spawn id (or null) per slot; always length {@link TEAM_SIZE}. */
	memberIds: (string | null)[];
}

/** The whole persisted collection plus which team is currently active. */
export interface TeamsState {
	id: ID;
	teams: Team[];
	activeTeamId: string | null;
}

function emptyMembers(): (string | null)[] {
	return Array.from({ length: TEAM_SIZE }, () => null);
}

function makeTeam(): Team {
	return { id: crypto.randomUUID(), name: '', memberIds: emptyMembers() };
}

function initialState(): TeamsState {
	return { id: 'teams', teams: [], activeTeamId: null };
}

/**
 * Manages the player's teams, persisted to localStorage via {@link ObjectServiceClass}.
 * The player can keep any number of teams (each with an optional name and up to
 * {@link TEAM_SIZE} distinct spawns) and mark exactly one as active. Assigning a
 * spawn already present in the same team moves it, clearing its old slot.
 */
class TeamService extends ObjectServiceClass<TeamsState> {
	constructor() {
		super('teams', initialState());
		this.normalize();
	}

	/** Repair older / malformed persisted shapes (slot count, dangling active id). */
	private normalize(): void {
		const state = this.get();
		const teams = (Array.isArray(state.teams) ? state.teams : []).map((team) => ({
			id: team.id,
			name: team.name ?? '',
			memberIds: Array.from({ length: TEAM_SIZE }, (_, i) => team.memberIds?.[i] ?? null)
		}));
		const activeTeamId = teams.some((team) => team.id === state.activeTeamId)
			? state.activeTeamId
			: (teams[0]?.id ?? null);
		this.set({ ...state, teams, activeTeamId });
	}

	/** Create a new empty team, make it active if none is, and return its id. */
	createTeam(): string {
		const team = makeTeam();
		this.store.update((state) => ({
			...state,
			teams: [...state.teams, team],
			activeTeamId: state.activeTeamId ?? team.id
		}));
		return team.id;
	}

	/** Delete a team; if it was active, fall back to the first remaining team. */
	removeTeam(teamId: string): void {
		this.store.update((state) => {
			const teams = state.teams.filter((team) => team.id !== teamId);
			const activeTeamId =
				state.activeTeamId === teamId ? (teams[0]?.id ?? null) : state.activeTeamId;
			return { ...state, teams, activeTeamId };
		});
	}

	/** Set a team's optional name. */
	renameTeam(teamId: string, name: string): void {
		this.updateTeam(teamId, (team) => ({ ...team, name }));
	}

	/** Mark a team as the active one. */
	setActive(teamId: string): void {
		this.store.update((state) => ({ ...state, activeTeamId: teamId }));
	}

	/** Assign a spawn to a slot, clearing it from any other slot in the same team. */
	setMember(teamId: string, index: number, spawnId: string | null): void {
		this.updateTeam(teamId, (team) => ({
			...team,
			memberIds: team.memberIds.map((id, i) => {
				if (i === index) return spawnId;
				if (spawnId && id === spawnId) return null;
				return id;
			})
		}));
	}

	/** Empty a single slot. */
	clearMember(teamId: string, index: number): void {
		this.updateTeam(teamId, (team) => ({
			...team,
			memberIds: team.memberIds.map((id, i) => (i === index ? null : id))
		}));
	}

	private updateTeam(teamId: string, mutate: (team: Team) => Team): void {
		this.store.update((state) => ({
			...state,
			teams: state.teams.map((team) => (team.id === teamId ? mutate(team) : team))
		}));
	}
}

export const teamService = new TeamService();
