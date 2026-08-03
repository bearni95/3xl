import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { profileAdapter } from '$adapters/classes/profile.adapter';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
import type { PublicProfile, PublicProfileRow } from '$types/profile.type';
import type { CharacterSpawn, CharacterSpawnRow } from '$types/character-spawn.type';
import type { MunicipalityHolder, MunicipalityHolderRow } from '$types/territory.type';

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
	/**
	 * The towns on the map they hold right now, newest taken first — their rows in
	 * `municipality_holders`, which is the map's own record of who occupies what and
	 * is world-readable because the map has to name every occupant to every visitor.
	 *
	 * The rows and not just a count of them: the profile lists the places, and each
	 * one is named, tiled and badged off the team frozen in its own row — the side as
	 * it won that town, which is not the side its holder fields today. Read live
	 * rather than stored on the profile: a town changes hands the moment somebody
	 * wins it, and a tally kept beside the account would be wrong from that moment
	 * until something thought to correct it.
	 */
	towns: MunicipalityHolder[];
}

/**
 * Somebody else's profile, read straight out of the two definer-owned views that
 * exist for it — `player_profiles_public` (the plate) and `player_spawns_public`
 * (every card they hold, the fielded ones carrying their slot) — plus
 * `municipality_holders_public`, which is not one of them: the map has always had
 * to name every town's occupant to every visitor, so the towns were public before
 * this page was. Neither the tables behind those views nor anything else about the
 * account is reachable from here — see `packages/backend/supabase/player_profiles.sql`
 * and `character_spawns.sql` for what is public and why.
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

		// All three at once: the plate, the cards and the towns are one reading of one
		// player, and there is nothing to do with any of them alone.
		const [profileRes, spawnsRes, townsRes] = await Promise.all([
			supabase
				.from('player_profiles_public')
				.select('user_id, username, exp, avatar_character_id, avatar_color, created_at')
				.eq('user_id', userId)
				.maybeSingle(),
			supabase
				.from('player_spawns_public')
				.select('user_id, team_slot, character_id, show_id, location_id, color, box, created_at')
				.eq('user_id', userId)
				.order('created_at', { ascending: false }),
			// The same view the map reads every town's occupant out of, asked for one
			// player's rows. Newest taken first, so the list opens on what they have just
			// won rather than on whatever they took first and never lost.
			supabase
				.from('municipality_holders_public')
				.select(
					'location_id, user_id, holder_name, team, turnover, taken_at, avatar_character_id, avatar_color'
				)
				.eq('user_id', userId)
				.order('taken_at', { ascending: false })
		]);
		if (profileRes.error) throw profileRes.error;
		if (spawnsRes.error) throw spawnsRes.error;
		if (townsRes.error) throw townsRes.error;
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
				.sort((a, b) => (a.teamSlot ?? 0) - (b.teamSlot ?? 0)),
			towns: (townsRes.data ?? []).map((row) =>
				territoryAdapter.fromHolderRow(row as MunicipalityHolderRow)
			)
		};
	}
}

export const publicProfileService = new PublicProfileService();
