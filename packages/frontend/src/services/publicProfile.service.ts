import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { profileAdapter } from '$adapters/classes/profile.adapter';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import type { PublicProfile, PublicProfileRow } from '$types/profile.type';
import type { CharacterSpawn, CharacterSpawnRow } from '$types/character-spawn.type';

/**
 * One player as everybody else may see them: their plate, the side they field, and
 * everything they hold.
 */
export interface PublicPlayer {
	profile: PublicProfile;
	/**
	 * Every card they hold, newest first — the same order the player's own roster
	 * reads them in.
	 */
	collection: CharacterSpawn[];
	/**
	 * The cards they field, in slot order — the lead first, as on the board. A
	 * subset of {@link collection}, not a second reading of it: a card is on the
	 * team by holding a slot, so the two can never disagree. Empty for a player who
	 * has not set a team, which is a state the page words rather than treats as a
	 * missing player.
	 */
	team: CharacterSpawn[];
}

/**
 * Somebody else's profile, read straight out of the two definer-owned views that
 * exist for it: `player_profiles_public` (the plate) and `player_spawns_public`
 * (every card they hold, the fielded ones carrying their slot). Neither the table
 * behind them nor anything else about the account is reachable from here — see
 * `packages/backend/supabase/player_profiles.sql` and `character_spawns.sql` for
 * what is public and why.
 *
 * There is no store: a public profile is a page's worth of somebody else, fetched
 * when that page is opened and gone when it is closed. Nothing else in the app
 * reads it, nothing writes it, and two visits to two different players must not
 * be able to leave one wearing the other's team.
 */
class PublicProfileService {
	/**
	 * Load the player with this Supabase user id, or `null` when there is no such
	 * account — which is what a mistyped or retired id looks like, and what the
	 * page turns into "no such profile".
	 *
	 * Throws only on a real failure (the network, a refusal), so a page can tell a
	 * profile that is not there from one it could not reach.
	 */
	async load(userId: string): Promise<PublicPlayer | null> {
		if (!isSupabaseConfigured()) return null;
		const supabase = getSupabaseClient();

		// Both at once: the plate and the cards are one reading of one player, and
		// there is nothing to do with either of them alone.
		const [profileRes, spawnsRes] = await Promise.all([
			supabase
				.from('player_profiles_public')
				.select('user_id, username, exp, avatar_character_id, avatar_color, created_at')
				.eq('user_id', userId)
				.maybeSingle(),
			supabase
				.from('player_spawns_public')
				.select('user_id, team_slot, character_id, show_id, location_id, color, box, created_at')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
		]);
		if (profileRes.error) throw profileRes.error;
		if (spawnsRes.error) throw spawnsRes.error;
		if (!profileRes.data) return null;

		// The view carries no spawn id — there is nothing anybody may do to somebody
		// else's card — so the rows are read through the same adapter with an empty
		// one. What a statue is drawn from is all here: who, in what colour, out of
		// which box, claimed where and when.
		const collection = (spawnsRes.data ?? []).map((row) =>
			spawnAdapter.fromRow({ ...(row as Omit<CharacterSpawnRow, 'id'>), id: '' })
		);

		return {
			profile: profileAdapter.fromPublicRow(profileRes.data as PublicProfileRow),
			collection,
			// Sorted here rather than asked for in slot order, because one query
			// answers both: the collection reads newest first, and a side reads lead
			// first whatever order its cards were claimed in.
			team: collection
				.filter((spawn) => spawn.teamSlot !== null)
				.sort((a, b) => (a.teamSlot ?? 0) - (b.teamSlot ?? 0))
		};
	}
}

export const publicProfileService = new PublicProfileService();
