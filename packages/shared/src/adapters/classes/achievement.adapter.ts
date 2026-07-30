import { AdapterClass } from './adapter.class';
import type { AchievementClaim, AchievementClaimRow } from '../../types/achievement.type';

/**
 * Transforms the rows `claim_achievements` returns into the internal
 * {@link AchievementClaim} model. Postgres serialises `bigint` — the experience
 * figures — as a string over the wire, so those are normalised back to numbers
 * here; the booleans are read defensively so a row missing one reads as "nothing
 * happened" rather than as an award.
 */
export class AchievementAdapter extends AdapterClass {
	constructor() {
		super('achievement');
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
			totalExp: Number(row.total_exp ?? 0)
		};
	}

	/** The whole result, in the order the RPC settled the badges. */
	fromClaimRows(rows: readonly AchievementClaimRow[] | null): AchievementClaim[] {
		return (rows ?? []).map((row) => this.fromClaimRow(row));
	}
}

export const achievementAdapter = new AchievementAdapter();
