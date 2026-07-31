import { writable, type Readable } from 'svelte/store';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { playerAvatarAdapter } from '$adapters/classes/player-avatar.adapter';
import type { PlayerAvatar, PlayerAvatarRow } from '$types/player-avatar.type';

/**
 * The signed-in player's owned avatars, backed by Supabase's `player_avatars`
 * table.
 *
 * There is no CRUD here and there cannot be: an avatar is dealt by a booster box
 * and by nothing else, so the table takes no client writes at all and this service
 * only ever *reads* it — plus {@link remember}, which folds an avatar the server
 * has just granted into the store so the picker has it without a second round
 * trip. Every rule about which avatars exist and who holds them lives in
 * `claim_booster`.
 */
class AvatarService {
	private avatarsStore = writable<PlayerAvatar[]>([]);

	/** The player's avatars, newest granted first. */
	get avatars(): Readable<PlayerAvatar[]> {
		return this.avatarsStore;
	}

	/**
	 * Load `userId`'s avatars into the store, newest first. RLS lets a player read
	 * only their own rows, so the filter is a narrowing rather than the protection.
	 * No-ops (and empties the store) when Supabase is unconfigured.
	 */
	async load(userId: string): Promise<PlayerAvatar[]> {
		if (!isSupabaseConfigured()) {
			this.avatarsStore.set([]);
			return [];
		}
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('player_avatars')
			.select('id, user_id, character_id, color, show_id, location_id, granted_at')
			.eq('user_id', userId)
			.order('granted_at', { ascending: false });
		if (error) throw error;

		const avatars = (data as PlayerAvatarRow[]).map((row) => playerAvatarAdapter.fromRow(row));
		this.avatarsStore.set(avatars);
		return avatars;
	}

	/**
	 * Fold an avatar the server has just granted into the store, newest first.
	 *
	 * A box may deal an avatar the player already holds — the same character in the
	 * same colour is the same item, and `claim_booster` hands the held row straight
	 * back rather than minting a second one — so this replaces by id instead of
	 * appending, and a repeat leaves the collection the size it was.
	 */
	remember(avatar: PlayerAvatar): void {
		this.avatarsStore.update((current) => [
			avatar,
			...current.filter((held) => held.id !== avatar.id)
		]);
	}

	/** Drop everything — for a player signing out. */
	clear(): void {
		this.avatarsStore.set([]);
	}
}

export const avatarService = new AvatarService();
