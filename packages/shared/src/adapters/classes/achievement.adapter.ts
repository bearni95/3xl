import { AdapterClass } from './adapter.class';
import type {
	AchievementAward,
	AchievementAwardRow,
	AchievementClaim,
	AchievementClaimRow
} from '../../types/achievement.type';

/**
 * Transforms Supabase's achievement rows into the internal models: the
 * `player_achievements` rows that say what a player has completed, and the rows
 * `claim_achievements` returns when they claim. Postgres serialises `bigint` — the
 * experience figures — as a string over the wire, so those are normalised back to
 * numbers here; the booleans are read defensively so a row missing one reads as
 * "nothing happened" rather than as an award.
 */
export class AchievementAdapter extends AdapterClass {
	constructor() {
		super('achievement');
	}

	/** One `player_achievements` row: a badge this player has completed. */
	fromAwardRow(row: AchievementAwardRow): AchievementAward {
		return {
			achievementId: String(row.achievement_id),
			awardedAt: row.awarded_at,
			expAwarded: Number(row.exp_awarded ?? 0)
		};
	}

	/** Every award a player holds, in the order the query returned them. */
	fromAwardRows(rows: readonly AchievementAwardRow[] | null): AchievementAward[] {
		return (rows ?? []).map((row) => this.fromAwardRow(row));
	}

	/** One row of the claim RPC's result. */
	fromClaimRow(row: AchievementClaimRow): AchievementClaim {
		return {
			achievementId: String(row.achievement_id),
			granted: row.granted === true,
			held: row.held === true,
			met: row.met === true,
			expAwarded: Number(row.exp_awarded ?? 0),
			atLevel: Number(row.at_level ?? 1),
			totalExp: Number(row.total_exp ?? 0),
			boostersGranted: Number(row.boosters_granted ?? 0),
			setCompleted: row.set_completed === true
		};
	}

	/** The whole result, in the order the RPC settled the badges. */
	fromClaimRows(rows: readonly AchievementClaimRow[] | null): AchievementClaim[] {
		return (rows ?? []).map((row) => this.fromClaimRow(row));
	}
}

export const achievementAdapter = new AchievementAdapter();
