import { AdapterClass } from './adapter.class';
import { SpawnColor } from '../../types/character-spawn.type';
import type {
	HolderTeamMember,
	MunicipalityChallenge,
	MunicipalityChallengeRow,
	MunicipalityHolder,
	MunicipalityHolderRow,
	MunicipalitySiege,
	MunicipalitySiegeRow
} from '../../types/territory.type';
import { levelForExp } from '../../utils/progression/level';
import { isSpawnColor } from '../../utils/spawn/color';
import type { TeamMemberRoll } from '../../utils/spawn/municipality-team';

/**
 * Transforms `municipality_holders` / `municipality_sieges` /
 * `municipality_challenges_open` rows between Supabase's snake_case shape and the
 * internal territory models.
 *
 * The holder's team travels as a `jsonb` array rather than as rows, so it arrives
 * as unvalidated JSON and is parsed defensively here: anything that isn't a
 * usable member is dropped rather than rendered as a broken card.
 */
export class TerritoryAdapter extends AdapterClass {
	constructor() {
		super('territory');
	}

	/** Transform a raw `municipality_holders` row into the internal model. */
	fromHolderRow(row: MunicipalityHolderRow): MunicipalityHolder {
		// The avatar is the pair or it is nothing, exactly as the profile adapter reads
		// the same two columns: half an avatar is not a lesser one, so a character with
		// no colour beside it leaves the holder on their letter.
		const avatarCharacterId =
			typeof row.avatar_character_id === 'string' && row.avatar_character_id.trim()
				? row.avatar_character_id
				: null;
		const avatarColor =
			avatarCharacterId && isSpawnColor(row.avatar_color) ? row.avatar_color : null;
		return {
			locationId: row.location_id,
			userId: row.user_id,
			// An account that never set a username still has to be nameable on the map.
			holderName: row.holder_name?.trim() || 'Un jugador',
			avatarCharacterId: avatarColor ? avatarCharacterId : null,
			avatarColor,
			// Read exactly as the profile adapter reads the same column: `exp` is a
			// bigint, so it arrives as a string, and the level is worked out from it
			// rather than stored. A holder whose profile row is missing entirely reads
			// as an account with no experience, which is level 1 — the same answer, and
			// not a hole in the band naming them.
			level: levelForExp(this.expFromRow(row.exp)),
			team: this.teamFromJson(row.team),
			turnover: Math.max(0, Math.trunc(Number(row.turnover ?? 0)) || 0),
			takenAt: row.taken_at
		};
	}

	/** The experience as a number, however Postgres serialised it. */
	private expFromRow(exp: unknown): number {
		const raw = Number(exp ?? 0);
		return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 0;
	}

	/** Transform a raw `municipality_sieges` row into the internal model. */
	fromSiegeRow(row: MunicipalitySiegeRow): MunicipalitySiege {
		return {
			locationId: row.location_id,
			userId: row.user_id,
			wins: Math.max(0, Math.trunc(Number(row.wins ?? 0)) || 0),
			turnover: Math.max(0, Math.trunc(Number(row.turnover ?? 0)) || 0)
		};
	}

	/** Transform a raw `municipality_challenges_open` row into the internal model. */
	fromChallengeRow(row: MunicipalityChallengeRow): MunicipalityChallenge {
		return {
			locationId: row.location_id,
			startedAt: row.started_at,
			settledAt: row.settled_at ?? null,
			// The cooldown's deadline, or null while the fight is still open — the wait
			// only starts once there is a finished fight to measure it from.
			availableAt: row.available_at ?? null
		};
	}

	/**
	 * Parse the stored `team` jsonb into members, skipping any entry without a
	 * usable character id. The colour falls back exactly as a spawn's would.
	 */
	private teamFromJson(value: unknown): HolderTeamMember[] {
		if (!Array.isArray(value)) return [];
		const members: HolderTeamMember[] = [];
		for (const entry of value) {
			if (!entry || typeof entry !== 'object') continue;
			const record = entry as Record<string, unknown>;
			const characterId = typeof record.character_id === 'string' ? record.character_id : '';
			if (!characterId) continue;
			members.push({
				characterId,
				color: isSpawnColor(record.color) ? record.color : SpawnColor.Red,
				// Absent on rows frozen before the RPC carried it, and on a card claimed
				// off the map — both read as "no town of its own".
				locationId: typeof record.location_id === 'string' ? record.location_id : null
			});
		}
		return members;
	}

	/**
	 * A holder's frozen team in the shape the map already renders seeded teams in,
	 * so an occupied town and an untouched one flow through exactly the same card
	 * and combat plumbing — only the source of the members differs.
	 */
	toTeamRolls(team: readonly HolderTeamMember[]): TeamMemberRoll[] {
		return team.map((member) => ({
			characterId: member.characterId,
			color: member.color,
			// Each card's own claim town travels with it, so a team fielded away from
			// home still says where each of its members is from.
			locationId: member.locationId
		}));
	}
}

export const territoryAdapter = new TerritoryAdapter();
