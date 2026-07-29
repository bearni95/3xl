import { writable, type Readable } from 'svelte/store';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { battleAdapter } from '$adapters/classes/battle.adapter';
import type { BattleBoardSnapshot, OpenBattle, OpenBattleRow } from '$types/battle.type';
import type { TeamMemberRoll } from '$utils/spawn/municipality-team';
import type { MunicipalityChallenge } from '$types/territory.type';
import { catalanDayIso } from '$utils/festes/catalan-day';

/**
 * The player's open battle: the one fight they may have running at a time.
 *
 * A fight lives in Supabase, not in this tab. {@link start} opens it (spending the
 * town's challenge for the day in the same transaction), {@link save} writes the
 * board back as each turn closes, and reporting the result through
 * `authService.reportCombat` is what clears it. So {@link open} is the answer to
 * "is this player in a fight, and which one" — asked once on load, which is how
 * they are put back into it after closing the arena, reloading, or coming back on
 * another device.
 *
 * The rules are the server's, as everywhere else here: this asks to start a battle
 * and is refused if the player already has one, if the town has been fought today,
 * or if they hold it themselves. Nothing in this file decides any of that.
 *
 * Everything degrades to "no battle" when Supabase is unconfigured, so auth-less
 * local dev still fights — it simply has nowhere to keep the fight, and closing the
 * arena there does lose it.
 */
class BattleService {
	private openStore = writable<OpenBattle | null>(null);

	/** The player's open battle, or null when they are not in one. */
	get open(): Readable<OpenBattle | null> {
		return this.openStore;
	}

	/**
	 * Read the open battle back off the server. Returns null when there is none, when
	 * signed out, or when Supabase is unconfigured. RLS scopes the table to its owner,
	 * so no filter is needed — at most one row can come back.
	 */
	async load(): Promise<OpenBattle | null> {
		if (!isSupabaseConfigured()) return null;
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('battles')
			.select('location_id, turnover, rivals, board, started_at')
			.maybeSingle();
		if (error) throw error;

		const battle = data ? battleAdapter.fromRow(data as OpenBattleRow) : null;
		this.openStore.set(battle);
		return battle;
	}

	/**
	 * Open a battle over `locationId` against `rivals`, the team the map is showing on
	 * that town, on the generation `turnover` it is showing them as.
	 *
	 * The rival line-up is frozen server-side here, which is what lets a fight outlive
	 * the town changing hands: whoever takes it, this battle goes on being against the
	 * three that were sitting there when it started. The day's challenge is spent in
	 * the same transaction, so a refusal (already fought today, a battle already open,
	 * the caller holds the town) costs nothing.
	 *
	 * Returns the challenge slot that was spent, so the map can close that town's
	 * button without a reload — or null when Supabase is unconfigured.
	 */
	async start(
		locationId: string,
		turnover: number,
		rivals: readonly TeamMemberRoll[]
	): Promise<MunicipalityChallenge | null> {
		if (!locationId) throw new Error('A town is required to start a challenge.');
		if (!isSupabaseConfigured()) return null;

		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('start_battle', {
			p_location_id: locationId,
			p_turnover: Math.max(0, Math.trunc(turnover) || 0),
			p_rivals: battleAdapter.rivalsToJson(rivals)
		});
		if (error) throw error;

		const row = Array.isArray(data) ? data[0] : data;
		this.openStore.set({
			locationId,
			turnover: Math.max(0, Math.trunc(turnover) || 0),
			rivals: [...rivals],
			board: null,
			startedAt: String(row?.opened_at ?? new Date().toISOString())
		});
		// The RPC's OUT names deliberately differ from the challenge table's columns, so
		// the slot it spent is assembled by hand rather than through the row adapter.
		return {
			locationId,
			date: String(row?.challenge_day ?? catalanDayIso()),
			startedAt: String(row?.opened_at ?? new Date().toISOString()),
			settledAt: null
		};
	}

	/**
	 * Write the board back, as each turn closes.
	 *
	 * Fire-and-forget by design: a save that fails or races the report which ended the
	 * fight costs the player the resumption of one turn at worst, and blocking the
	 * board on the network would cost them the fight's rhythm every turn. The server
	 * silently ignores a save with no battle behind it for the same reason.
	 */
	async save(board: BattleBoardSnapshot): Promise<void> {
		if (!isSupabaseConfigured()) return;
		const supabase = getSupabaseClient();
		const { error } = await supabase.rpc('save_battle', { p_board: board });
		if (error) throw error;
		this.openStore.update((current) => (current ? { ...current, board } : current));
	}

	/**
	 * Forget the open battle locally, after the server has cleared it — reporting a
	 * finished fight deletes the row, so the store must let go of it too or the map
	 * would go on offering the way back into a fight that is over.
	 */
	clear(): void {
		this.openStore.set(null);
	}
}

export const battleService = new BattleService();
