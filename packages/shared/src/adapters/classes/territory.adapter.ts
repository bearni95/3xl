import { AdapterClass } from './adapter.class';
import { SpawnColor } from '../../types/character-spawn.type';
import type {
	HolderTeamMember,
	MunicipalityHolder,
	MunicipalityHolderRow,
	MunicipalitySiege,
	MunicipalitySiegeRow
} from '../../types/territory.type';
import { isSpawnColor } from '../../utils/spawn/color';
import { normalizeSpawnStat } from '../../utils/spawn/stat';
import type { TeamMemberRoll } from '../../utils/spawn/municipality-team';

/**
 * Transforms `municipality_holders` / `municipality_sieges` rows between
 * Supabase's snake_case shape and the internal territory models.
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
		return {
			locationId: row.location_id,
			userId: row.user_id,
			// An account that never set a username still has to be nameable on the map.
			holderName: row.holder_name?.trim() || 'Un jugador',
			team: this.teamFromJson(row.team),
			turnover: Math.max(0, Math.trunc(Number(row.turnover ?? 0)) || 0),
			takenAt: row.taken_at
		};
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

	/**
	 * Parse the stored `team` jsonb into members, skipping any entry without a
	 * usable character id. Colour and stat fall back exactly as a spawn's would.
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
				stat: normalizeSpawnStat(record.stat)
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
			stat: member.stat
		}));
	}
}

export const territoryAdapter = new TerritoryAdapter();
